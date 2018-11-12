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
let AutoTaskManager = require('./util/taskManager')
let Collection = require('./util/Collection')
let config = require('./util/configInterface')  //配置文件管理
let req = require('./util/req')
let conn = require('./util/sequel')
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
        corelist.map(srv=>{
            let srvObj = require(srv.path);
            srvObj.mapping().map(key=>{
                this.serverTypeMapping[key] = srvObj;
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
     * 返回运行环境配置文件
     */
    static get ini(){
        return iniFile;
    }

    /**
     * 获取核心对象
     */
    static get current(){
        return this.$current;
    }
    /**
     * 设置核心对象
     */
    static set current(val){
        this.$current = val;
        return this.$current;
    }
    /**
     * @return {UserEntity}
     */
    static get UserEntity(){
        return this.EntityList.UserEntity;
    }

    static get BaseEntity(){
        return this.EntityList.BaseEntity;
    }

    static get BaseUserEntity() {
        return require('./model/entity/BaseUserEntity');
    }

    static get BaseAllyObject() {
        return require('./model/entity/BaseAllyObject');
    }
    
    static get BaseLogEntity() {
        return require('./model/entity/log');
    }

    static get CoreOfBase(){
        return require('./core/CoreOfBase');
    }
    
    static get req(){
        return req;
    }
    static get EntityList(){
        if(!this.$EntityList) {
            this.$EntityList = {};
            if(this.$addition) {
                this.$EntityList['UserEntity'] = require(`${process.cwd()}/app/model/entity/UserEntity`);  //指向用户自定义的角色类
                this.$EntityList['AllyObject'] = require(`${process.cwd()}/app/model/entity/AllyObject`);  //指向用户自定义的联盟类
            }
            else {
                this.$EntityList['UserEntity'] = require('./model/entity/BaseUserEntity');  //指向原生定义的角色类
                this.$EntityList['AllyObject'] = require('./model/entity/BaseAllyObject');  //指向原生定义的联盟类
            }

            this.$EntityList['AllyNews'] = require('./model/entity/AllyNews');  //指向原生联盟新闻类
            this.$EntityList['mails'] = require('./model/entity/mails');        //指向原生邮箱类
            this.$EntityList['BaseEntity'] = require('./model/BaseEntity');     //指向原生基础实体类
        }

        return this.$EntityList;
    }
    static get Control(){
        return require('./util/baseCtl');
    }
    static get Service(){
        return require('./util/baseService');
    }
    static get config(){
        return config;
    }
    static get configration(){
        return config.fileMap;
    }
    static get Indicator(){
        return Indicator;
    }
    static get conn(){
        return conn;
    }
    static get AutoTaskManager(){
        return AutoTaskManager;
    }
    static get updateMgr(){
        return updateMgr;
    }
    /**
     * 获取常用函数集
     */
    static get util(){
        return commonFunc;
    }
    static get Collection(){
        return Collection;
    }
    /**
     * 获取常用枚举集
     */
    static get const(){
        return constList;
    }

    static get getAsnyc(){
        return getAsnyc;
    }
    
    static get cache(){
        return cache;
    }

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
    static get formula(){
        return formula;
    }
    /**
     * 返回全部ORM模型列表
     */
    static get models(){
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
    static get entities(){
        if(!this.$entities){
            //载入全部Entity模块
            this.$entities = {};
            filelist.mapPackagePath(`${__dirname}/./model/entity`).map(mod=>{
                let mid = mod.name.split('.')[0];
                this.entities[mid] = require(mod.path);
            });
            if(this.$addition) {
                filelist.mapPath('app/model/entity').map(mod=>{
                    let mid = mod.name.split('.')[0];
                    this.entities[mid] = require(mod.path);
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
        return require('./util/comm/EventData');
    }
}

Facade.Util = Util;

exports = module.exports = Facade;
