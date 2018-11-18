let express = require('express')
let io = require('socket.io')
let fs = require('fs')

let facade = require('../Facade')
let {ReturnCode, EntityType, IndexType, CommMode} = facade.const
let {env} = require('../define/env')
let Control = facade.Control
let UserEntity = facade.entities.UserEntity;
let connectMonitor = require('../util/autoExec/connectMonitor')
let AutoTaskManager = require('../util/taskManager')
let rpc = require('../util/mixin/rpc')

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

        let self = this;

        /**
         * 证书
         */
        this.credentials = {
            key: fs.readFileSync(process.cwd() + '/config/cert/server.key', 'utf8'), 
            cert: fs.readFileSync(process.cwd() + '/config/cert/server.crt', 'utf8'),
        };
        
        /**
         * 所有服务器的配置信息列表
         */
        this.serversInfo = require('../../game.config').servers;
        /**
         * 当前服务器的配置信息
         */
        this.options = $env;
        
        //中间件设定，子类可覆盖
        this.middlewareSetting = {
            default: ['parseParams', 'commonHandle']
        };

        //扩展服务对象列表
        this.service = {};
        //载入框架预定义的全局扩展服务对象(不包括子目录)，子类会加载对应子目录中的专用扩展服务对象
        facade.config.filelist.mapPackagePath(`${__dirname}/../service`, false).map(srv=>{
            let srvObj = require(srv.path);
            this.service[srv.name.split('.')[0]] = new srvObj(this);
        });

        //中间件列表
        this.middleware = {};
        //载入框架规定的中间件
        facade.config.filelist.mapPackagePath(`${__dirname}/../middleware`).map(srv => {
            let handle = require(srv.path).handle;
            let handleName = !!srv.cname ? `${srv.cname}.${srv.name.split('.')[0]}` : `${srv.name.split('.')[0]}`;
            this.middleware[handleName] = handle;
        });

        //挂载plugin函数到核心类
        facade.config.filelist.mapPackagePath(`${__dirname}/../plugin`).map(srv=>{
            let funcList = require(srv.path);
            let moduleName = srv.name.split('.')[0];
            Object.keys(funcList).map(key=>{
                if(moduleName == 'default'){
                    this[key] = function(...arg){
                        return funcList[key](self, ...arg);
                    }
                }
                else{
                    if(!this[moduleName]){
                        this[moduleName] = {};
                    }
                    this[moduleName][key] = function(...arg){
                        return funcList[key](self, ...arg);
                    }
                }
            });
        });

        /**
         * Control列表 由子类构造函数载入实际内容
         * @type {Array<Control>}
         */
        this.control = {};

        //系统内部事件映射表，由子类视需要载入实际内容
        this.eventHandleList = {};

        //定时任务管理器
        this.autoTaskMgr = new AutoTaskManager(this);

        //映射门面对象，方便在this指针指向FacadeOfBase实例的环境内快速调用
        this.facade = facade;

        this.loadingList = {};
    }

    

    /**
     * 设置静态资源映射
     * @param {*} route 
     * @param {*} path 
     */
    static(route, path) {
        if(this.app) {
            this.app.use(route, express.static(path));
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
     * 加载用户自定义模块
     */
    async loadModel() {
        let self = this;
        //挂载用户自定义的plugin函数到核心类
        facade.config.filelist.mapPath('app/plugin').map(srv=>{
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

        //载入用户自定义的全局扩展服务对象(不扫描子目录)，子类会加载对应子目录中的专用扩展服务对象
        facade.config.filelist.mapPath('app/service', false).map(srv=>{
            let srvObj = require(srv.path);
            this.service[srv.name.split('.')[0]] = new srvObj(this);
        });

        //载入用户自定义中间件，@note:将覆盖同名系统中间件
        facade.config.filelist.mapPath('app/middleware').map(srv => {
            let handle = require(srv.path).handle;
            let handleName = !!srv.cname ? `${srv.cname}.${srv.name.split('.')[0]}` : `${srv.name.split('.')[0]}`;
            this.middleware[handleName] = handle;
        });
    }

    /**
     * 自启函数，子类可继承
     * 绑定Http Server服务，将对index.html的访问映射到Control
     * @param {*} app   Http Server对象
     */
    async Start(app){
        app.get('/index.html', async (req, res) => {
            console.log(`来访URL(${Date()})：${JSON.stringify(req.query)}`);

            let _socket = {};
            try{
                _socket.user = await facade.GetObject(EntityType.User, req.query.oemInfo.token, IndexType.Token);
                
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
                _socket.user = await facade.GetObject(EntityType.User, req.body.oemInfo.token, IndexType.Token);
                
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
                try{
                    let ret = await this.callFunc(control, item[1], req.query);
                    //console.log(ret);
                    res.send(ret);
                }
                catch(e){
                    console.error(e);
                    res.end();
                }
            });
            router.post(item[0], async (req, res) => {
                try{
                    let ret = await this.callFunc(control, item[1], req.body);
                    //console.log(ret);
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
    StartSocketServer(app){
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
        this.autoTaskMgr.addCommonMonitor(facade.GetRanking(UserEntity));
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
     */
    notifyEvent(ev, data){
        if(!!this.eventHandleList[ev]){
            try{
                this.eventHandleList[ev](data);
            }
            catch(e){
                console.error(e);
            }
        }
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

        if(!socket.user && !!msg.oemInfo && !!msg.oemInfo.token){
            //根据用户上行的token进行预登录
            socket.user = facade.GetObject(EntityType.User, msg.oemInfo.token, IndexType.Token)
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
     * 远程调用，支持req和notify两种方式
     * @param $func         //远程函数名称
     * @param $params       //参数数组
     * @param $cb           //回调，为空则表示notify
     * @param si            //服务器类型、编号, 逻辑服到索引服不需填写
     * @returns {Promise.<{code: number}>}
     */
    async remoteCall($func, $params, $cb, si){
        $params = $params || {};

        let attr = {
            control: "remote",
            func: $func,
            msg: $params,
        };

        let connector = null;
        if(this.options.serverType == 'Index'){
            let svr = this.service.servers.getServer(si.stype, si.sid);
            if(!!svr){
                connector = svr.socket;
            }
        }
        else {
            if(!this.remoting.user){ //尚未登录，补充登录信息
                attr.oemInfo = {openid:"system", openkey: this.options.admin.role.system};
                attr.stype =  this.options.serverType;
                attr.sid = this.options.serverId;
            }

            connector = this.remoting;
        }

        if(!!connector){
            if(!!$cb){
                let ret = await new Promise(resolve => {
                    connector.emit('req', attr, msg=>{
                        resolve(msg);
                    });
                });

                return $cb(ret);
            }
            else{
                connector.emit('notify', attr);
            }
        }
    }    
}

facade.tools.mixin(CoreOfBase, rpc);

/**
 * 关于exports和module.exports的释义：
 * 初始时，module.exports = exports = {}; 真正的接口是 module.exports, exports只是辅助性的，直白点，就是个备胎
 * module.exports 没有被修改，则 exports与module.exports还是引用同一个对象，
 * 如果module.exports 被改变，则module.exports 与 exports已经不是一条心了，任你exports怎么改，跟module.exports有什么关系呢
 */
exports = module.exports = CoreOfBase;
