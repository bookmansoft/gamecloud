let express = require('express')
let io = require('socket.io')
let fs = require('fs')

let facade = require('../../Facade')
let extendObj = facade.tools.extend
let {ReturnCode, EntityType, IndexType, CommMode, env, ResType} = facade.const
let Control = facade.Control
let connectMonitor = require('../../util/autoExec/connectMonitor')
let AutoTaskManager = require('../../util/taskManager')
let Mapping = require('../../util/mixin/Mapping')
let Ranking = require('../../util/mixin/Ranking')
let ConfigManager = require('../../util/potential/ConfigManager')
let {ConfigMgr} = require('../../util/battle/Action')
let socketClient = require('socket.io-client')

/**
 * 门面管理类
 * 
 * @noet node.js模块化方案中，交叉引用可能引发问题
 * @note 一旦已经赋值了 module.exports 后，继续使用 exports.* 引入其他内容将无效
 * @note 类静态函数中可以使用 this，它指向类本身
 */
class CoreOfBase
{
    /**
     * 构造器，传入外部配置信息
     * @param {env} $env
     */
    constructor($env) {
        //为节点命名，外部不可更改
        this.$nodeName = 'base';
        this.app = null; //express 对象的缓存
        let self = this;

        /**
         * 证书
         */
        this.credentials = {};

        //载入控制器
        this.$router = {};

        let keyName = process.cwd() + '/config/cert/server.key', crtName = process.cwd() + '/config/cert/server.crt';
        if(fs.existsSync(keyName) && fs.existsSync(crtName)) {
            this.credentials.key = fs.readFileSync(keyName, 'utf8');
            this.credentials.cert = fs.readFileSync(crtName, 'utf8');
        }
        
        /**
         * 所有服务器的配置信息列表
         */
        this.serversInfo = require(`${process.cwd()}/gameconfig`).servers;
        /**
         * 当前服务器的配置信息
         */
        this.options = $env;
        
        //中间件配置管理，子类可覆盖, 约定和类名称相同的中间件为鉴权中间件
        this.middlewareSetting = {};
        this.middlewareSetting.default = ['parseParams', 'auth', 'commonHandle', 'afterHandle'];
        
        //中间件列表
        this.middleware = {};
        this.service = {};
        /**
         * Control列表 由子类构造函数载入实际内容
         * @type {Array<Control>}
         */
        this.control = {};

        //系统内部事件映射表，由子类视需要补充加载
        this.eventHandleList = {};

        //配置表列表
        this.fileMap = {};

        for(let cls of this.GetInheritArray()) {
            //载入控制器(具备文件级可继承特性，继承过程中，低级的同名控制器模块会被高级的覆盖)
            facade.config.filelist.mapPackagePath(`${__dirname}/../${cls}/control`).map(ctrl => {
                let ctrlObj = require(ctrl.path);
                let token = ctrl.name.split('.')[0];
                this.control[token] = new ctrlObj(this);
    
                //读取控制器自带的中间件设置
                if(!!this.control[token].middleware) {
                    this.middlewareSetting[token] = this.control[token].middleware;
                }
    
                //读取控制器自带的Url路由设置
                if(!!this.control[token].router) {
                    this.$router[token] = this.control[token].router;
                }
            });

            //载入框架预定义的Service(具备文件级可继承特性，继承过程中，低级的同名服务模块会被高级的覆盖)
            facade.config.filelist.mapPackagePath(`${__dirname}/../${cls}/service`).map(srv => {
                let srvObj = require(srv.path);
                this.service[srv.name.split('.')[0]] = new srvObj(this);
            });

            //载入框架规定的中间件(具备文件级可继承特性，继承过程中，低级的同名中间件模块会被高级的覆盖)
            facade.config.filelist.mapPackagePath(`${__dirname}/../${cls}/middleware`).map(srv => {
                let handle = require(srv.path).handle;
                let handleName = !!srv.cname ? `${srv.cname}.${srv.name.split('.')[0]}` : `${srv.name.split('.')[0]}`;
                this.middleware[handleName] = handle;
            });

            //载入框架预定义的plugin函数(具备函数级可继承特性，继承过程中，低级的同名函数(而不是文件模块)会被高级的覆盖)
            facade.config.filelist.mapPackagePath(`${__dirname}/../${cls}/plugin`).map(srv=>{
                let moduleName = srv.name.split('.')[0];

                let funcList = require(srv.path);
                Object.keys(funcList).map(key => {
                    if(moduleName == 'default') {
                        //default.js 中的函数，作为Core的一级属性
                        this[key] = function(...arg) {
                            return funcList[key](self, ...arg);
                        }
                    } else {
                        //其余文件模块中的函数，以模块名为一级属性，函数为二级属性
                        if(!this[moduleName]) {
                            this[moduleName] = {};
                        }
                        this[moduleName][key] = function(...arg) {
                            return funcList[key](self, ...arg);
                        }
                    }
                });
            });

            //载入框架规范的逻辑事件
            facade.config.filelist.mapPackagePath(`${__dirname}/../${cls}/events`).map(srv=>{
                let handle = require(srv.path).handle;
                let handleName = !!srv.cname ? `${srv.cname}.${srv.name.split('.')[0]}` : `${srv.name.split('.')[0]}`;
                this.eventHandleList[handleName] = handle.bind(this);
            });

            //载入配置表文件, 可继承
            for(let fl of facade.config.filelist.mapPath(`config/data`)) {
                let id = fl.name.split('.')[0];
                this.fileMap[id] = facade.config.ini.get(fl.path).GetInfo();
            }
        }

        //定时任务管理器
        this.autoTaskMgr = new AutoTaskManager(this);

        this.potentialConfig = new ConfigManager(this);
        this.TaskStaticList = {};
        //战斗配置管理
        this.ConfigMgr = new ConfigMgr(this);

        //映射门面对象，方便在this指针指向FacadeOfBase实例的环境内快速调用
        this.facade = facade;

        //初始载入的数据库表列表
        this.loadingList = [];

        //特殊资源处理登记 - 并非存储于背包中的普通物品
        this.specialRes = {};
        this.RegisterResHandle('$default', async (user, bonus) => {
        });
    }

    /**
     * 登记特殊资源处理句柄
     * @param {*} type      资源类型
     * @param {Function} handle    处理句柄 (user, bonus) => {}
     */
    RegisterResHandle(type, handle) {
        this.specialRes[type] = handle;
    }

    /**
     * 获取常用枚举集
     */
    get const() {
        if(!this.$constList) {
            this.$constList = {};

            for(let cls of this.GetInheritArray()) {
                try {
                    let en = require(`../${cls}/enum`);
                    if(!!en) {
                        extendObj(this.$constList, en);
                    }
                } catch(e) { }
            }

            if(facade.$addition) {
                for(let cls of this.GetInheritArray()) {
                    try {
                        let en = require(`${process.cwd()}/app/core/${cls}/enum`);
                        if(!!en) {
                            extendObj(this.$constList, en);
                        }
                    } catch(e) { }
                }
            }
        }
        return this.$constList;
    }

    /**
     * 返回全部表映射类
     */
    get models() {
        if(!this.$models){
            this.$models = {};

            for(let cls of this.GetInheritArray()) {
                //载入全部ORM模块
                facade.config.filelist.mapPackagePath(`${__dirname}/../${cls}/model/table`).map(mod=>{
                    let mid = mod.name.split('.')[0];
                    this.$models[mid] = require(mod.path)[mid];
                });
                if(facade.$addition) {
                    facade.config.filelist.mapPath(`app/core/${cls}/model/table`).map(mod=>{
                        let mid = mod.name.split('.')[0];
                        this.$models[mid] = require(mod.path)[mid];
                    });
                }
            }
        }
        return this.$models;
    }

    /**
     * 返回全部 ORM 映射类
     */
    get entities() {
        if(!this.$entities) {
            this.$entities = {};
            //将 UserEntity AllyObject 也指向原生模块 
            this.$entities.UserEntity = require('./model/entity/BaseUserEntity');  //指向原生定义的角色类
            this.$entities.AllyObject = require('./model/entity/BaseAllyObject');  //指向原生定义的联盟类

            for(let cls of this.GetInheritArray()) { 
                //载入原生Entity模块
                facade.config.filelist.mapPackagePath(`${__dirname}/../${cls}/model/entity`).map(mod=>{
                    let mid = mod.name.split('.')[0];
                    this.$entities[mid] = require(mod.path);
                });

                if(facade.$addition) {
                    //载入用户自定义Entity模块，如果用户有重载 UserEntity AllyObject 则自动覆盖之前的设置
                    facade.config.filelist.mapPath(`app/core/${cls}/model/entity`).map(mod=>{
                        let mid = mod.name.split('.')[0];
                        this.$entities[mid] = require(mod.path);
                    });
                }
            }
        }
        return this.$entities;
    }
    
    /**
     * 添加路由: 静态型或函数型
     * @param {String}      path      路由的路径
     * @param {Function}    func      资源路径或者路由处理句柄 data => {}
     */
    addRouter(path, func) {
        if(!this.app) {
            return;
        }

        if(typeof func == 'string') {
            this.app.use(path, express.static(func));
        } else if(typeof func == 'function') {
            let router = express.Router();
            router.get(path, async (req, res) => {
                try {
                    res.send(await (func.bind(this))(req.query));
                } catch(e) {
                    res.end();
                    console.error(e);
                }
            });
            router.post(path, async (req, res) => {
                try {
                    res.send(await (func.bind(this))(req.query));
                } catch(e) {
                    res.end();
                    console.error(e);
                }
            });
    
            this.app.use("/", router);
        }
    }

    /**
     * 添加启动阶段载入的模型
     * @param {*} ty        模型的类型
     */
    addLoadingModel(ty) {
        this.loadingList.push(ty);
    }

    /**
     * 映射自己的服务器类型数组，提供给核心类的类工厂使用
     * @returns {Array}
     */
    static get mapping() {
        return [];
    }

    /**
     * 查询并返回实体对象
     * @param {*} etype 实体对象的类型
     * @param {*} index 索引值
     * @param {*} itype 索引类型
     */
    GetObject(etype, index, itype = facade.const.IndexType.Primary){
        return this.GetMapping(etype).GetObject(index, itype);
    }

    /**
     * 处理特殊奖励
     * @param {*} user 
     * @param {*} bonus 
     */
    handleSpecialRes(user, bonus) {
        if(typeof bonus.type == 'string') {
            bonus.type = ResType[bonus.type];
        }

        if(this.specialRes[bonus.type]) {
            this.specialRes[bonus.type](user, bonus).catch(e=>{
                console.log(e);
            });
        } else {
            this.specialRes['$default'](user, bonus).catch(e=>{
                console.log(e);
            });
        }
    }

    /**
     * 获取实体对象的集合映射体
     * @param {*} etype 实体对象的类型
     * @return {Mapping}
     */
    GetMapping(etype) {
        if(!this.muster) {
            this.muster = {};

            Object.keys(this.entities).map(key => {
                let entity = this.entities[key];           
                this.muster[entity.mapParams.etype] = Mapping.muster(entity, this);
            });
        }
        return this.muster[etype];
    }

    /**
     * 获取类/对象的排序管理器
     * @param {*} obj 代表排序集合的类/对象
     * @return {Ranking}
     */
    GetRanking(obj){
        if(!this.rankMuster){
            this.rankMuster = {};
        }

        if(!this.rankMuster[obj]) {
            this.rankMuster[obj] = Ranking.muster(obj);
        }

        return this.rankMuster[obj];
    }

    /**
     * 获取类/对象的排序结果
     * @param {*} obj   代表排序集合的类/对象
     * @param {*} id    标识集合中对象的索引值
     * @param {*} type  排序类别
     */
    GetRankInfo(obj, id, type){
        return this.GetRanking(obj).result(id, type);
    }

    /**
     * 返回描述类继承关系的数组，以基类 CoreOfBase 为首个元素
     */
    GetInheritArray() {
        let proto = this.__proto__, clsInherit = [];
        while(proto) {
            if(proto.constructor.name == 'Object' || proto.constructor.name == 'Function' || proto.constructor.name == 'CoreOfBase') { //处理到基类，停止迭代
                clsInherit.push('CoreOfBase');
                break;
            }
            clsInherit.push(proto.constructor.name);
            proto = proto.__proto__;
        }
        return clsInherit.reverse();
    }

    /**
     * 加载用户自定义模块
     */
    async loadModel() {
        let self = this;

        //遍历静态配置表，载入全部任务
        this.TaskStaticList = {};

        //战斗配置管理
        this.ConfigMgr = new ConfigMgr(this);

        for(let cls of this.GetInheritArray()) {
            //载入用户自定义的全局扩展服务对象
            facade.config.filelist.mapPath(`app/core/${cls}/service`).map(srv=>{
                let srvObj = require(srv.path);
                this.service[srv.name.split('.')[0]] = new srvObj(this);
            });

            //挂载用户自定义的plugin函数到核心类
            facade.config.filelist.mapPath(`app/core/${cls}/plugin`).map(srv=>{
                let funcList = require(srv.path);
                let moduleName = srv.name.split('.')[0];
                Object.keys(funcList).map(key=>{
                    if(moduleName == 'default') {
                        this[key] = function(...arg){
                            return funcList[key](self, ...arg);
                        }
                    } else {
                        if(!this[moduleName]){
                            this[moduleName] = {};
                        }
                        this[moduleName][key] = function(...arg){
                            return funcList[key](self, ...arg);
                        }
                    }
                });
            });

            //载入各自独立的控制器
            facade.config.filelist.mapPath(`app/core/${cls}/control`).map(ctrl => {
                let ctrlObj = require(ctrl.path);
                let token = ctrl.name.split('.')[0];
                this.control[token] = new ctrlObj(this);
    
                //读取控制器自带的中间件设置
                if(!!this.control[token].middleware){
                    this.middlewareSetting[token] = this.control[token].middleware;
                }
                //读取控制器自带的Url路由设置
                if(!!this.control[token].router){
                    this.$router[token] = this.control[token].router;
                }
            });

            //载入用户自定义中间件，@note:将覆盖同名系统中间件
            facade.config.filelist.mapPath(`app/core/${cls}/middleware`).map(srv => {
                let handle = require(srv.path).handle;
                let handleName = !!srv.cname ? `${srv.cname}.${srv.name.split('.')[0]}` : `${srv.name.split('.')[0]}`;
                this.middleware[handleName] = handle;
            });

            //载入用户自定义的逻辑事件
            facade.config.filelist.mapPath(`app/core/${cls}/events`).map(srv=>{
                let handle = require(srv.path).handle;
                let handleName = !!srv.cname ? `${srv.cname}.${srv.name.split('.')[0]}` : `${srv.name.split('.')[0]}`;
                this.eventHandleList[handleName] = handle.bind(this);
            });

            //载入用户自定义配置文件
            for(let fl of facade.config.filelist.mapPath(`config/${cls}`)) {
                let id = fl.name.split('.')[0];
                this.fileMap[id] = facade.config.ini.get(fl.path).GetInfo();
            }
        }
    }

    /**
     * 自启函数，子类可继承
     * 绑定Http Server服务，将对index.html的访问映射到Control
     * @param {*} app   Http Server对象
     */
    async Start(app) {
        this.app = app;

        //加载路由配置
        Object.keys(this.$router).map(id=>{
            app.use("/", this.makeRouter(id, this.$router[id]));
        });

        app.get('/index.html', async (req, res) => {
            console.log(`来访URL(${Date()})：${JSON.stringify(req.query)}`);

            let _socket = {};
            try{
                _socket.user = await this.GetObject(EntityType.User, req.query.oemInfo.token, IndexType.Token);
                
                //提取客户端IP信息
                req.query.userip = req.ip.match(/\d+.\d+.\d+.\d+/)[0];
                let ini = {socket:_socket, msg: req.query, fn: res.send.bind(res), recy:true, facade: this};
                let middles = (req.query.control && !!this.middlewareSetting[req.query.control]) ? this.middlewareSetting[req.query.control] : this.middlewareSetting["default"];
                if(!!middles){
                    for(let func of middles){
                        if(ini.recy && this.middleware[func]){
                            await this.middleware[func](ini);
                        }
                    }
                }
                else{
                    res.end();
                }
            }catch(e){
                res.end();
            }
        });

        app.post('/index.html', async (req, res) => {
            console.log(`来访URL(${Date()})：${JSON.stringify(req.body)}`);

            let _socket = {};
            try{
                _socket.user = await this.GetObject(EntityType.User, req.body.oemInfo.token, IndexType.Token);
                
                //提取客户端IP信息
                req.body.userip = req.ip.match(/\d+.\d+.\d+.\d+/)[0];
                let ini = {socket:_socket, msg: req.body, fn: res.send.bind(res), recy:true, facade: this};
                let middles = (req.body.control && !!this.middlewareSetting[req.body.control]) ? this.middlewareSetting[req.body.control] : this.middlewareSetting["default"];
                if(!!middles){
                    for(let func of middles){
                        if(ini.recy && this.middleware[func]){
                            await this.middleware[func](ini);
                        }
                    }
                }
                else{
                    res.end();
                }
            }catch(e){
                res.end();
            }
        });
    }

    /**
     * 生成路由对象
     * @param {*} control       指定映射的控制器名称
     * @param {Array} config    路由配置数组 [[path, func]]
     */
    makeRouter(control, config){
        let router = express.Router();

        config.map(item=>{
            router.get(item[0], async (req, res) => {
                try {
                    //配置型路由不能自动注入用户对象，这类路由的处理句柄是 async data => {params} 而非普通控制器方法的 async (user, data) => {}
                    let ret = await this.callFunc(control, item[1], Object.assign({req:req, res:res}, req.query||{}, req.params||{}, req.body||{}));
                    res.send(ret);
                } catch(e) {
                    console.error(e);
                    res.end();
                }
            });
            router.post(item[0], async (req, res) => {
                try{
                    //配置型路由不能自动注入用户对象，这类路由的处理句柄是 async data => {params} 而非普通控制器方法的 async (user, data) => {}
                    let ret = await this.callFunc(control, item[1], Object.assign({req:req, res:res}, req.query||{}, req.params||{}, req.body||{}));
                    res.send(ret);
                }
                catch(e){
                    console.error(e);
                    res.end();
                }
            });
        });
        
        return router;
    }

    /**
     * 利用反射机制，调用相应的控制器方法
     * @param ctrl              控制器名称
     * @param type              控制器内部函数名
     * @param user              来访者实体对象
     * @param objData           参数对象
     * @returns {Promise.<*>}
     */
    async callFunc(ctrl, type, user, objData){
        try{
            if(this.control.hasOwnProperty(ctrl)) {
                if(this.control[ctrl].__proto__.hasOwnProperty(type) 
                || this.control[ctrl].hasOwnProperty(type)
                || (typeof this.control[ctrl][type] === 'function')) {
                    return await this.control[ctrl][type](user, objData);
                }
            }
        }
        catch(e){
            console.error(e);
        }
        return {code: ReturnCode.Error};
    }

    /**
     * 创建WS类型的Socket服务
     * @param app
     */
    StartSocketServer(app) {
        let httpObj = require(this.options.UrlHead); 
        httpObj.globalAgent.maxSockets = Infinity;
        let hrv = this.options.UrlHead == "https" ? 
            httpObj.createServer(this.credentials, app) : 
            httpObj.createServer(app);

        //启动网络服务
        this.numOfOnline = 0;
        hrv.listen(this.options.webserver.port, this.options.webserver.host, () => {
            console.log(`网络服务在端口 ${this.options.webserver.port} 上准备就绪`);
            //在既有http服务的基础上，创建WebSocket服务
            this.service.io = io(hrv);
            this.service.server = this.service.io.on('connection', socket => {
                if(this.numOfOnline > this.options.MaxConnection){//限制最大连接数
                    socket.disconnect();
                    return;
                }

                socket.commMode = CommMode.ws;
                socket.once('disconnect', () => {//断线处理
                    socket.removeAllListeners();

                    if(!!socket.user){
                        try{
                            this.notifyEvent('user.afterLogout', {user:socket.user});
                        }
                        finally{
                            socket.user.socket = null;
                            socket.user = null;
                        }
                    }
                });

                socket.on('req', (msg, fn) => {//JSONP请求
                    if(!!msg.url) {//Restfu形式的请求, 要对参数数组进行转化
                        function UrltoParams(url){
                            let tmp = url.split('?');
                            if(tmp.length>1){
                                let array = tmp[1].split('&');
                                return array.reduce((sofar, cur)=>{
                                    let param = cur.split('=');
                                    if(param.length>1 && !!param[1]){
                                        sofar[param[0]] = param[1];
                                    }
                                    return sofar;
                                }, {});
                            }
                        }
                        let params = UrltoParams(msg.url);
                        params.url = msg.url;
                        //params.oemInfo = {openid:params.sessionid, domain:params.domain, token:params.token};
                        params.oemInfo = {openid:params.sessionid||"18681223392", domain:params.domain||"official"};
                        params.control = `P${params.act}`;
                        if(!params.func){
                            params.func = 'Execute'; //设置默认的入口函数名
                        }

                        msg = params;
                    }
                    msg.userip = socket.request.connection.remoteAddress; //记录客户端IP

                    if(this.options.debug){
                        console.dir(msg); //打印上行参数
                    }

                    this.onSocketReq(socket, msg, fn).then(()=>{}).catch(e=>{console.log(e);});
                });

                socket.on('notify', (msg) => {//客户端通知消息
                    msg.userip = socket.request.connection.remoteAddress; //记录客户端IP
                    this.onSocketReq(socket, msg, null).then(()=>{}).catch(e=>{console.log(e);});
                });
            });
        });

        //网络连接监控
        this.autoTaskMgr.addMonitor(new connectMonitor());
        //排行榜监控
        this.autoTaskMgr.addCommonMonitor(this.GetRanking(this.entities.UserEntity));
    }

    /**
     * 创建进行远程访问的客户端
     * @param stype     //远程服务器类型
     * @param sid       //远程服务器编号
     */
    initConnector(stype, sid){
        if(!!this.remoting){
            this.remoting.removeAllListeners();
            this.remoting.disconnect();
            this.remoting = null;
        }

        //注意：访问的是目标服务器的mapping（外部映射）地址
        this.remoting = socketClient(`${this.options.UrlHead}://${this.serversInfo[stype][sid].webserver.mapping}:${this.serversInfo[stype][sid].webserver.port}`, {'force new connection': true})
        .on('req', (msg, fn) => {//监听JSONP请求 
            this.onSocketReq(this.remoting, msg, fn).catch(e=>{console.log(e);});
        })
        .on('notify', msg => {//监听JSONP请求
            this.onSocketReq(this.remoting, msg, null).catch(e=>{console.log(e);});
        })
        .on('disconnect', ()=>{//断线重连
            console.log(`${this.options.serverType}.${this.options.serverId} disconnect`);
            this.remoting.stamp = (new Date()).valueOf();
            this.remoting.user = null;
            this.remoting.needConnect = true;
            setTimeout(()=>{
                if(this.remoting.needConnect){
                    this.remoting.needConnect = false;
                    this.remoting.connect();
                }
            }, 1500);
        })
        .on('connect', ()=>{//向Index Server汇报自身的身份
            console.log(`${this.options.serverType}.${this.options.serverId} connected`);
            
            this.remoteCall('serverLogin', {}, msg => {
                if(msg.code == ReturnCode.Success) {
                    console.log(`${this.options.serverType}.${this.options.serverId} logined`);
                    this.remoting.stamp = (new Date()).valueOf();
                    this.remoting.user = {stype: this.options.serverType, sid: this.options.serverId, socket: this.remoting};
                }
                else{
                    console.log(`${this.options.serverType}.${this.options.serverId} failed login: ${msg.code}`);
                }
            })
        });
    }

    /**
     * 指定类型的服务器数量
     * @param {*} stype
     */
    serverNum(stype){
        if(!!this.serversInfo[stype]){
            return Object.keys(this.serversInfo[stype]).length;
        }
        return 0;
    }

    /**
     * 触发内部自定义事件
     * @param {*} ev 
     * @param {*} data 
     * @returns {Object} {code, data}
     */
    async notifyEvent(ev, data) {
        let func = this.eventHandleList[ev];
        if(!!func) {
            try {
                return await func(data);
            } catch(e) {
                return Promise.reject(e);
            }
        }
        return {code:0};
    }

    /**
     * 检测密码是否有效
     * @param id
     * @param token
     * @returns {boolean}
     */
    checkMobileToken(id, token){
        return this.options.admin.role.default == token;
    }

    /**
     * 认证或生成新的session
     * @param id            手机号
     * @param key           验证码或密码
     * @param session       先前生成的session
     */
    registerSession(id, key, session){
        if(!this.mobileSessions){
            this.mobileSessions = {};
        }
        if(!!session && !!this.mobileSessions[session]
            && ((facade.util.now() - this.mobileSessions[session].time) < this.options.auth.sessionExp)
            && (this.mobileSessions[session].session == session)
        ){
            return this.mobileSessions[session]; //返回session
        }
        else{
            //如果session不存在，或者已经超过有效期，开始检测验证码或者密码
            if(this.options.debug || (this.checkMobileToken(id, key))){
                session = facade.util.sign({id:id, key:key},this.options.game_secret);
                let ret = {
                    openid:id, 
                    openkey:key, 
                    session: session, 
                    time: facade.util.now()
                }; 
                //注册新的session
                this.mobileSessions[session] = ret;
                return ret;
            }
            else{
                return null;
            }
        }
    }

    /**
     * Socket报文处理句柄
     * @param socket                通讯管理器
     * @param msg                   收到的消息
     * @param fn                    回调函数
     * @returns {Promise.<void>}
     */
    async onSocketReq(socket, msg, fn){
        fn = fn || (()=>{});
        msg = msg || {};
        if(typeof msg.oemInfo == 'string') {
            msg.oemInfo = JSON.parse(decodeURIComponent(msg.oemInfo));
        }

        if(!socket.user && !!msg.oemInfo && !!msg.oemInfo.token){
            //根据用户上行的token进行预登录
            socket.user = this.GetObject(EntityType.User, msg.oemInfo.token, IndexType.Token)
        }

        let ini = {socket:socket, msg:msg, fn:fn, recy:true, facade: this};
        let middles = (!!msg.control && !!this.middlewareSetting[msg.control]) ? this.middlewareSetting[msg.control] : this.middlewareSetting["default"];
        if(!!middles){
            for(let func of middles){
                if(ini.recy && this.middleware[func]){
                    try {
                        await this.middleware[func](ini);
                    }
                    catch(e) {
                        console.error(e);
                    }
                }
            }
        }
        else{
            fn({ code: ReturnCode.routerFailed });
        }
    }

    /**
     * 遍历在线用户
     * @param cb
     */
    forAll(cb){
        Object.keys(this.service.server.connected).map(it=>{
            if(!!this.service.server.connected[it].user){
                cb(this.service.server.connected[it].user);
            }
        });
    }

    /**
     * 远程调用服务类方法
     * @param {*} $func 
     * @param {*} $params 
     * @param {*} $cb 
     */
    async remoteService($func, $params, $cb) {
        $cb = $cb || (msg => { return msg; });
        return await this.remoteCall('service', {func: $func, msg: $params}, $cb);
    }

    /**
     * 从一个逻辑节点，远程调用另一个逻辑节点的控制器方法
     * @param {*} $func 
     * @param {*} $params 
     * @param {*} $si 
     * @param {*} $cb 
     */
    async remoteLogic($func, $params, $si, $cb) {
        $cb = $cb || (msg => { return msg; });
        return await this.remoteCall('routeCommand', {func: $func, msg: $params, si: $si}, $cb);
    }

    /**
     * 远程调用控制器方法，支持req和notify两种方式
     * @param $func         //远程函数名称
     * @param $params       //参数数组
     * @param $cb           //回调，为空则表示notify
     * @param si            //服务器类型、编号, 逻辑服到索引服不需填写
     * @returns {Promise.<{code: number}>}
     */
    async remoteCall($func, $params, $cb, si) {
        $params = $params || {};
        $func = $func.split('.');

        let attr = {
            msg: $params,
        };

        attr.control = 'remote'; //锁定只能访问 remote 控制器
        if($func.length >=2) {
            attr.func = $func[1];
        } else {
            attr.func = $func[0];
        }

        let connector = null;
        if(this.options.serverType == 'Index') {
            let svr = this.service.servers.getServer(si.stype, si.sid);
            if(!!svr){
                connector = svr.socket;
            }
        } else {
            if(!this.remoting.user) { //尚未登录，补充登录信息
                attr.oemInfo = {openid:"system", openkey: this.options.admin.role.system};
                attr.stype =  this.options.serverType;
                attr.sid = this.options.serverId;
            }

            connector = this.remoting;
        }

        if(!!connector) {
            if(!!$cb) {
                let ret = await new Promise(resolve => {
                    connector.emit('req', attr, msg=>{
                        resolve(msg);
                    });
                });

                return $cb(ret);
            } else {
                connector.emit('notify', attr);
            }
        }
    }    
}

/**
 * 关于exports和module.exports的释义：
 * 初始时，module.exports = exports = {}; 真正的接口是 module.exports, exports只是辅助性的，直白点，就是个备胎
 * module.exports 没有被修改，则 exports与module.exports还是引用同一个对象，
 * 如果module.exports 被改变，则module.exports 与 exports已经不是一条心了，任你exports怎么改，跟module.exports有什么关系呢
 */
exports = module.exports = CoreOfBase;
