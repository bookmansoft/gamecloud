/**
 * bootstrap
 */
let httpProxy = require('http-proxy');
let express = require('express');
let EventEmitter = require('events').EventEmitter;
EventEmitter.defaultMaxListeners = 0;

//注入通用函数
require('./util/mixin/base');

// Uncaught exception handler
process.on('uncaughtException', function(err) {
    console.error(' Caught exceptio n: ' + err.stack);
});

let commonFunc = require('./util/commonFunc');
let getAsnyc = require('./util/async')
let cache = require('./util/cache')
let formula = require('./util/formula')
let Indicator = require('./util/Indicator')
let updateMgr = require('./util/updateMgr')
let Collection = require('./util/Collection')
let config = require('./util/configInterface')  //配置文件管理
let {applyMixins, extendObj, clone} = require('./util/mixin/comm')
let filelist = require('./util/filelist')
let iniFile = require(`${process.cwd()}/gameconfig`);

/**
 * 门面对象
 */
class Facade
{
    /**
     * 启动支持反向代理的静态门户网站
     * @param {String} options.protocol      协议 http/https
     * @param {Object} options.router        路由 {host: {target,}}
     * @param {String} options.port          守护端口
     */
    static startProxy(options) {
        // 新建一个代理 Proxy Server 对象  
        var proxy = httpProxy.createProxyServer({});  
        proxy.on('error', function (err, req, res) {  
            res.writeHead(500, {'Content-Type': 'text/plain'});  
            res.end('Something went wrong.');  
        });  
        // 在每次请求中，调用 proxy.web(req, res config) 方法进行请求分发  
        var server = (require(options.protocol||'http')).createServer(function(req, res) {  
            var host = req.headers.host, ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            if(options.router[host]) {
                proxy.web(req, res, { target: options.router[host].target });
            } else {
                res.writeHead(200, {'Content-Type': 'text/plain'});  
                res.end('Welcome! visit [wallet.vallnet.cn] for wallet service and [crm.vallnet.cn] for crm service.');
            }
        });  
        server.listen(options.port);
    }

    /**
     * 添加一个静态内容服务站
     * @description 相比通过 facade.boot 传入 static 数组而言，该方法能灵活指定协议、地址和端口
     * 
     * @param {*} protocol          协议 http / https
     * @param {*} host              主机地址
     * @param {*} port              主机端口
     * @param {Object} route        路由设置
     */
    static addWebSite(protocol, host, port, route) {
        let app = express();
        if(Array.isArray(route)) {
            route.map(rt => {
                if(typeof rt.dir == 'string') {
                    app.use(rt.path, express.static(rt.dir));
                } else if(typeof rt.dir == 'function') {
                    let router = express.Router();
                    router.request(path, async (req, res) => {
                        try {
                            res.send(await rt.dir(req.query));
                        } catch(e) {
                            res.end();
                            console.error(e);
                        }
                    });
                    app.use("/", router);
                }
            });
        }

        let httpObj = require(protocol);
        let hrv = httpObj.createServer(app);
        hrv.listen(port, host, () => {
            console.log(`静态网站服务在 ${protocol}://${host}:${port} 上准备就绪`);
        });
    }

    /**
     * 系统主引导流程
     * @param {*} options 启动参数数组
     */
    static async boot(options) {
        options = options || {};

        //主程序启动，提供包括Http、Socket、路由解析等服务
        let core = this.FactoryOfCore(options);

        if(this.$addition) { //加载用户自定义模块
            await core.loadModel();
        }

        //将用户自定义表添加到自动加载列表中
        if(options.loading) {
            options.loading.map(table=>{
                core.addLoadingModel(table);
            });
        }
        
        let app = express();
        //启用跨域访问
        app.all('*',function (req, res, next) {
            //	允许应用的跨域访问
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
            res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
        
            if (req.method == 'OPTIONS') {
                //让options请求快速返回
                res.send(200);
            } else {
                next();
            }
        });
        
        //region 添加POST模式下的body解析器
        let bodyParser = require('body-parser');
        app.use(bodyParser.urlencoded({extended: true}))
        app.use(bodyParser.json());
        //endregion
        
        //载入持久化层数据，开放通讯服务端口，加载所有控制器相关的路由、中间件设定
        await core.Start(app);

        if(options.static) {
            for(let [route, path] of options.static) {
                core.addRouter(route, path);
            }
        }

        //如果通过 plugin 机制定义了 startAfter 函数，则在此自动执行
        if(typeof core.startAfter == 'function') {
            await core.startAfter();
        }

        //下发404 必须在控制器路由、静态资源路由全部加载之后设定
        app.use(function(req, res, next) {
            res.status(404).send('Sorry cant find the path!');
        });

        //捕获并下发错误码 必须放在最后！
        app.use(function(err, req, res, next) {
            console.error(err.stack);
            res.status(500).send('Something broke!');
        });

        return core;
    }

    /**
     * 创建核心类实例的类工厂
     * @param {*} options.env 运行环境
     * @returns {CoreOfBase}
     */
    static FactoryOfCore(options) {
        if(!this.serverType || !this.serverTypeMapping) {
            this.serverType = {};
            this.serverTypeMapping = {};
    
            //自动从指定目录载入系统定义和用户自定义的核心类
            let corelist = filelist.mapPackagePath(`${__dirname}/./core/`, {filename:'core.js'});
            if(this.$addition) {
                corelist = corelist.concat(filelist.mapPath('app/core/', {filename:'core.js'}));
            }
            corelist.map(srv => {
                let srvObj = require(srv.path);
                this.serverType[srv.cname] = srvObj; //节点类列表
                srvObj.mapping.map(key => {
                    this.serverTypeMapping[key] = srvObj; //节点类映射列表，每个节点类可能映射多个条目
                });
            });
        }

        let env = options.env || {};
        if(!!this.serverTypeMapping[env.serverType] && !!this.ini.servers[env.serverType] && !!this.ini.servers[env.serverType][env["serverId"]]) {
            let ret = new this.serverTypeMapping[env.serverType](this.tools.extend(
                {serverType: env.serverType, serverId: env.serverId},
                this.ini.servers["Index"][1],
                this.ini.servers[env.serverType][env["serverId"]]
            ));
            extendObj(ret.options, options);
            return ret;
        } else {
            throw new Error(`无法识别的服务器类型和编号 ${env.serverType}.${env.serverId}`);
        }
    }    

    /**
     * 读取加载附加自定义模块标志
     */
    static get addition() {
        return this.$addition || false;
    }
    /**
     * 设置加载附加自定义模块标志，链式操作
     */
    static set addition(val) {
        this.$addition = val;
        return this;
    }

    /**
     * 建立关键字和核心类之间的映射关系，用于建立核心对象的类工厂中
     * @param {Array} pair 形如[keyword, CoreClassName]的数组
     * 
     * @note 核心类的静态mapping方法规定了服务器类型映射关系，但可以随时调用registerServer补充新的映射关系
     */
    static registerServer(pair) {
        if(!!pair) { //带参数表示补录映射关系
            this.serverTypeMapping[pair[0]] = pair[1];
        }
    }

    /**
     * 获取当前运行环境的节点对象
     */
    static get current(){
        return this.$current;
    }
    /**
     * 设置当前运行环境的节点对象
     */
    static set current(val){
        this.$current = val;
        return this.$current;
    }

    //region 内置的节点类
    static get CoreOfBase() {
        return require('./core/CoreOfBase/core');
    }
    static get CoreOfIndex() {
        return require('./core/CoreOfIndex/core');
    }
    static get CoreOfLogic() {
        return require('./core/CoreOfLogic/core');
    }
    //endregion

    //region 可用于继承的基础类

    /**
     * 集合管理类
     */
    static get Collection(){
        return Collection;
    }

    /**
     * 基础控制器类
     */
    static get Control(){
        return require('./util/baseCtl');
    }
    /**
     * 基础服务类
     */
    static get Service(){
        return require('./util/baseService');
    }
    /**
     * 基础助手类
     */
    static get Assistant(){
        return require('./util/baseAssistant');
    }

    /**
     * 背包管理基础类
     */
    static get Assistants() {
        return {
            Pocket: require('./core/CoreOfBase/model/assistant/item'),
        }
    }

    /**
     * 指向原生基础实体类
     */
    static get BaseEntity(){
        return require('./util/BaseEntity');
    }

    /**
     * 指向原生基础用户类
     */
    static get BaseUserEntity() {
        return require('./core/CoreOfBase/model/entity/BaseUserEntity');
    }

    /**
     * 指向原生基础联盟类
     */
    static get BaseAllyObject() {
        return require('./core/CoreOfBase/model/entity/BaseAllyObject');
    }
    
    /**
     * 指向原生基础日志类
     */
    static get BaseLogEntity() {
        return require('./core/CoreOfBase/model/entity/BuyLogEntity');
    }

    //endregion

    /**
     * 返回全部助手类
     */
    static get assistants() {
        if(!this.$assistants){
            this.$assistants = {};
            filelist.mapPackagePath(`${__dirname}/./model/assistant`).map(mod=>{
                let mid = mod.name.split('.')[0];
                this.$assistants[mid] = require(mod.path);
            });
            if(this.$addition) {
                filelist.mapPath('app/model/assistant').map(mod=>{
                    let mid = mod.name.split('.')[0];
                    this.$assistants[mid] = require(mod.path);
                });
            }
        }
        return this.$assistants;
    }

    /**
     * 工具箱
     */
    static get tools() {
        return {
            mixin:  applyMixins,                    //混合对象属性函数
            extend: extendObj,                      //扩展对象函数
            clone:  clone,                          //深度复刻对象函数
            Sequelize: require('sequelize'),        //sequelize类
            seqconn: require('./util/sequel'),      //mysql连接器
            maintain: require('./util/maintain'),   //执行数据维护任务
            formula: formula,                       //表达式计算
            cache: cache,                           //缓存管理
            Indicator: Indicator,                   //标志位管理
            updateMgr: updateMgr,                   //定时刷新器
            getAsnyc: getAsnyc,
            Lock: require('./util/Lock')
        };
    }

    /**
     * 所有自动化执行类的列表
     */
    static get autoExec() {
        if(!this.$autoExec){
            this.$autoExec = {};
            filelist.mapPackagePath(`${__dirname}/./util/autoExec`).map(mod=>{
                let mid = mod.name.split('.')[0];
                this.$autoExec[mid] = require(mod.path);
            });
            if(this.$addition) {
                filelist.mapPath('app/util/autoExec').map(mod=>{
                    let mid = mod.name.split('.')[0];
                    this.$autoExec[mid] = require(mod.path);
                });
            }
        }
        return this.$autoExec;
    }

    /**
     * 返回运行环境配置文件
     */
    static get ini(){
        return iniFile;
    }
    /**
     * 业务配置文件管理
     */
    static get config(){
        return config;
    }
    /**
     * 获取常用函数集
     */
    static get util(){
        return commonFunc;
    }
    /**
     * 获取常用枚举集
     * @description facade.const 只载入 CoreOfBase/enum 中的常量定义，而 core.const 严格按照原型链顺序载入全部常量定义
     */
    static get const(){
        if(!this.$constList) {
            this.$constList = require(`${__dirname}/core/CoreOfBase/enum`);
            if(this.$addition) {
                extendObj(this.$constList, require(`${process.cwd()}/app/core/CoreOfBase/enum`));
            }
        }
        return this.$constList;
    }

    /**
     * 添加用户自定义资源类型
     * @param {*} num   资源类型数值定义，数值介乎 90000～99999 之间
     * @param {*} type  资源类型字符串定义
     * @returns {Boolean} 定义是否生效
     */
    static addResType(num, type) {
        if(num >= 90000 && num <= 99999 && !this.const.ResType[type]) {
            this.const.ResType[type] = num;
            return true;
        }
        return false;
    }
}

class Util
{
    static get BonusObject() {
        return require('./util/comm/BonusObject');
    }

    static get ConfigManager() {
        return require('./util/potential/ConfigManager');
    }

    static get ConfigMgr() {
        let {ConfigMgr} = require('./util/battle/Action');
        return ConfigMgr;
    }

    static get EffectManager() {
        return require('./util/comm/EffectManager');
    }

    static get ChatPrivateManager() {
        return require('./util/comm/ChatPrivateManager');
    }

    static get EffectObject() {
        return require('./util/comm/EffectObject');
    }

    static get TollgateObject() {
        return require('./util/tollgate/TollgateObject');
    }

    static get OperationInfo() {
        return require('./util/tollgate/OperationInfo');
    }

    static get PotentialClientItem() {
        return require('./util/potential/PetClientItem');
    }

    static get BattleManager() {
        return require('./util/battle/BattleManager');
    }

    static get BaseBattleParam() {
        let {BaseBattleParam} = require('./util/battle/util');
        return BaseBattleParam;
    }

    static get BattleHero() {
        let {BattleHero} = require('./util/battle/hero');
        return BattleHero;
    }

    static get TaskObject() {
        return require('./util/comm/TaskObject');
    }

    static get LargeNumberCalculator() {
        return require('./util/comm/LargeNumberCalculator');
    }

    static get EventData() {
        let {EventData}  = require('./util/comm/EventData');
        return EventData;
    }
}

Facade.Util = Util;

exports = module.exports = Facade;
