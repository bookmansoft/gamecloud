/**
 * bootstrap
 */
let express = require('express');
let app = express();
let EventEmitter = require('events').EventEmitter;
EventEmitter.defaultMaxListeners = 0;

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

//注入通用函数
require('./util/mixin/base');

// Uncaught exception handler
process.on('uncaughtException', function(err) {
    console.error(' Caught exceptio n: ' + err.stack);
});

let Mapping = require('./util/mixin/Mapping')
let Ranking = require('./util/mixin/Ranking')
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
let iniFile = require('../game.config');

//加载所有常量定义
let constList = require( './define/comm')
for(let fl of filelist.mapPackagePath(`${__dirname}/./define`)){
    let id = fl.name.split('.')[0];
    if(id != 'comm'){
        let n = require(fl.path);
        extendObj(constList, n);
    }
}

/**
 * 门面对象
 */
class Facade
{
    /**
     * 系统主引导流程
     * @param {*} options 启动参数数组
     */
    static boot(options) {
        this.serverType = {};
        this.serverTypeMapping = {};

        if(this.$addition) {
            for(let fl of filelist.mapPath('app/define')){
                let n = require(fl.path);
                extendObj(constList, n);
            }
        }

        //自动从指定目录载入系统定义和用户自定义的核心类
        let corelist = filelist.mapPackagePath(`${__dirname}/./core`, false);
        if(this.$addition) {
            corelist.concat(filelist.mapPath('app/core', false));
        }
        corelist.map(srv => {
            let srvObj = require(srv.path);
            this.serverType[srv.name.split('.')[0]] = srvObj; //节点类列表
            srvObj.mapping().map(key=>{
                this.serverTypeMapping[key] = srvObj; //节点类映射列表，每个节点类可能映射多个条目
            });
        });

        //主程序启动，提供包括Http、Socket、路由解析等服务
        let core = this.FactoryOfCore(!!options?options.env:{});
        extendObj(core.options, options);

        if(this.$addition) { //加载用户自定义模块
            core.loadModel();
        }

        //将用户自定义表添加到自动加载列表中
        if(options.loading) {
            options.loading.map(table=>{
                core.addLoadingModel(table);
            });
        }
        
        //载入持久化层数据，开放通讯服务端口，加载所有控制器相关的路由、中间件设定
        core.Start(app);

        //下发404 必须在控制器路由、静态资源路由全部加载之后设定
        app.use(function(req, res, next) {
            res.status(404).send('Sorry cant find the path!');
        });

        //捕获并下发错误码 必须放在最后！
        app.use(function(err, req, res, next) {
            console.error(err.stack);
            res.status(500).send('Something broke!');
        });
    }

    /**
     * 静态资源路由和路径映射函数
     * @param {*} route     静态资源的路由
     * @param {*} path      静态资源的路径
     */
    static static(route, path) {
        app.use(route, express.static(path));
    }

    /**
     * 创建核心类实例的类工厂
     * @param {*} env 运行环境
     */
    static FactoryOfCore(env) {
        if(!!this.serverTypeMapping[env.serverType] && !!this.ini.servers[env.serverType] && !!this.ini.servers[env.serverType][env["serverId"]]) {
            this.current = new this.serverTypeMapping[env.serverType](this.tools.extend(
                {serverType: env.serverType, serverId: env.serverId},
                this.ini.servers["Index"][1],
                this.ini.servers[env.serverType][env["serverId"]]
            ));
        }
        else{
            throw new Error(`无法识别的服务器类型和编号 ${env.serverType}.${env.serverId}`);
        }
        return this.current;
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
        return require('./core/CoreOfBase');
    }
    static get CoreOfIndex() {
        return require('./core/CoreOfIndex');
    }
    static get CoreOfLogic() {
        return require('./core/CoreOfLogic');
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
     * 基础服务类
     */
    static get Assistant(){
        return require('./model/baseAssistant');
    }

    /**
     * 指向原生基础实体类
     */
    static get BaseEntity(){
        return require('./model/BaseEntity');
    }

    /**
     * 指向原生基础用户类
     */
    static get BaseUserEntity() {
        return require('./model/entity/BaseUserEntity');
    }

    /**
     * 指向原生基础联盟类
     */
    static get BaseAllyObject() {
        return require('./model/entity/BaseAllyObject');
    }
    
    /**
     * 指向原生基础日志类
     */
    static get BaseLogEntity() {
        return require('./model/entity/log');
    }

    //endregion

    /**
     * 获取实体对象的集合映射体
     * @param {*} etype 实体对象的类型
     * @return {Mapping}
     */
    static GetMapping(etype){
        if(!this.muster){
            this.muster = {};

            let self = this;
            Object.keys(this.entities).map(key=>{
                let entity = self.entities[key];           
                self.muster[entity.mapParams.etype] = Mapping.muster(entity);
            });
        }
        return this.muster[etype];
    }
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
     * 返回全部表映射类
     */
    static get models() {
        if(!this.$models){
            //载入全部ORM模块
            this.$models = {};
            filelist.mapPackagePath(`${__dirname}/./model/table`).map(mod=>{
                let mid = mod.name.split('.')[0];
                this.$models[mid] = require(mod.path)[mid];
            });
            if(this.$addition) {
                filelist.mapPath('app/model/table').map(mod=>{
                    let mid = mod.name.split('.')[0];
                    this.$models[mid] = require(mod.path)[mid];
                });
            }
        }
        return this.$models;
    }
    /**
     * 返回全部 ORM 映射类
     */
    static get entities(){
        if(!this.$entities) {
            this.$entities = {};

            //载入原生Entity模块
            filelist.mapPackagePath(`${__dirname}/./model/entity`).map(mod=>{
                let mid = mod.name.split('.')[0];
                this.$entities[mid] = require(mod.path);
            });
            //将 UserEntity AllyObject 也指向原生模块 
            this.$entities.UserEntity = require('./model/entity/BaseUserEntity');  //指向原生定义的角色类
            this.$entities.AllyObject = require('./model/entity/BaseAllyObject');  //指向原生定义的联盟类

            if(this.$addition) {
                //载入用户自定义Entity模块，如果用户有重载 UserEntity AllyObject 则自动覆盖之前的设置
                filelist.mapPath('app/model/entity').map(mod=>{
                    let mid = mod.name.split('.')[0];
                    this.$entities[mid] = require(mod.path);
                });
            }
        }
        return this.$entities;
    }

    /**
     * 获取类/对象的排序管理器
     * @param {*} obj 代表排序集合的类/对象
     * @return {Ranking}
     */
    static GetRanking(obj){
        if(!this.rankMuster){
            this.rankMuster = {};
        }

        if(!this.rankMuster[obj]){
            this.rankMuster[obj] = Ranking.muster(obj);
        }

        return this.rankMuster[obj];
    }

    /**
     * 查询并返回实体对象
     * @param {*} etype 实体对象的类型
     * @param {*} index 索引值
     * @param {*} itype 索引类型
     */
    static GetObject(etype, index, itype = Facade.const.IndexType.Primary){
        return this.GetMapping(etype).GetObject(index, itype);
    }

    /**
     * 获取类/对象的排序结果
     * @param {*} obj   代表排序集合的类/对象
     * @param {*} id    标识集合中对象的索引值
     * @param {*} type  排序类别
     */
    static GetRankInfo(obj, id, type){
        return this.GetRanking(etype).result(id, type);
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
     */
    static get const(){
        return constList;
    }
}

class Util
{
    static get BonusObject() {
        return require('./util/comm/BonusObject');
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

    static get ConfigManager() {
        return require('./util/potential/ConfigManager');
    }
    
    static get ConfigMgr() {
        let {ConfigMgr} = require('./util/battle/Action');
        return ConfigMgr;
    }

    static get BaseBattleParam() {
        let {BaseBattleParam} = require('./util/battle/util');
        return BaseBattleParam;
    }

    static get BattleHero() {
        let {BattleHero} = require('./util/battle/hero');
        return BattleHero;
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
