/**
 * Updated by Administrator on 2017-11-29.
 */
let facade = require('../Facade')
let CoreOfBase = facade.CoreOfBase
let {serverType, EntityType, ReturnCode, CommMode} = facade.const
let socketClient = require('socket.io-client')
let um = require('../util/updateMgr');
let {User} = require('../model/table/User');
/**
 * 逻辑服对应的门面类
 */
class CoreOfLogic extends CoreOfBase 
{
    constructor($env){
        super($env);

        //中间件设定
        this.middlewareSetting = {
            default: ['parseParams', 'authHandle', 'commonHandle', 'afterHandle']
        };
        
        //载入控制器
        this.$router = {};
        facade.config.filelist.mapPath('/app/control/logic').map(ctrl=>{
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

        //载入框架规定的Service
        facade.config.filelist.mapPath('/facade/service/logic').map(srv=>{
            let srvObj = require(srv.path);
            this.service[srv.name.split('.')[0]] = new srvObj(this);
        });
        //载入用户自定义Service
        facade.config.filelist.mapPath('/app/service/logic').map(srv=>{
            let srvObj = require(srv.path);
            this.service[srv.name.split('.')[0]] = new srvObj(this);
        });

        //事件映射
        this.eventHandleList = {};
        //载入框架规范的逻辑事件
        facade.config.filelist.mapPath('/facade/events').map(srv=>{
            let handle = require(srv.path).handle;
            let handleName = !!srv.cname ? `${srv.cname}.${srv.name.split('.')[0]}` : `${srv.name.split('.')[0]}`;
            this.eventHandleList[handleName] = handle.bind(this);
        });
        //载入用户自定义的逻辑事件
        facade.config.filelist.mapPath('/app/events').map(srv=>{
            let handle = require(srv.path).handle;
            let handleName = !!srv.cname ? `${srv.cname}.${srv.name.split('.')[0]}` : `${srv.name.split('.')[0]}`;
            this.eventHandleList[handleName] = handle.bind(this);
        });
    }

    /**
     * 映射自己的服务器类型数组，提供给核心类的类工厂使用
     */
    static mapping(){
        return ['IOS', 'Android'];
    }

    /**
     * 自启函数
     * @param {*} app 
     */
    async Start(app){
        super.Start(app);

        //载入路由配置
        Object.keys(this.$router).map(id=>{
            app.use("/", this.makeRouter(id, this.$router[id]));
        });

        //加载持久化层的数据
        console.time('Load Db');
        await this.service.activity.loadDb(); //首先载入活动信息，后续的用户积分信息才能顺利注册

        Promise.all([
            facade.GetMapping(EntityType.User).loadAll(),   //载入用户
            facade.GetMapping(EntityType.Ally).loadAll(),   //载入联盟信息
            facade.GetMapping(EntityType.AllyNews).loadAll(),     //载入联盟新闻
            facade.GetMapping(EntityType.Mail).loadAll(),        //载入邮件
            facade.GetMapping(EntityType.BuyLog).loadAll(),          //载入消费日志
        ]).then(()=>{
            console.timeEnd('Load Db');
            console.log(`${this.options.serverType}.${this.options.serverId}: 数据载入完成，准备启动网络服务...`);

            //启动对外网络服务
            this.StartSocketServer(app);
            
            //建立内部RPC机制
            this.initConnector("Index", 1);
        }).catch(e=>{
            throw e;
        });

        //活动检测
        this.autoTaskMgr.addCommonMonitor(fo=>{
            fo.service.activity.checkStatus();
            return false;
        });
        
        //用户活动信息载入        
        try{
            let ret = await User(facade.current.options.mysql.db, facade.current.options.mysql.sa, facade.current.options.mysql.pwd).findAll();
            for(let i = 0; i++; i < ret.length){
                let pUser = await facade.GetObject(EntityType.User, ret[i].id);
                //载入玩家的活动参与信息
                if(pUser.getVipMgr().v.aId > 0){
                    facade.current.service.activity.setScore(pUser, pUser.getVipMgr().v.aId, pUser.getVipMgr().v.aScore, pUser.getVipMgr().v.aLv);
                }
            }
        }
        catch(e){
            console.error(e);
        }
        
        //关卡探险随机事件触发
        this.autoTaskMgr.addCommonMonitor(fo=>{
            for(let s of Object.values(this.service.server.connected)){
                if(!!s.user){
                    //触发随机事件
                    s.user.getEventMgr().RandomEvent(s.user);
                }
            }
        }, 60000);
    }

    /**
     * 当前总注册量
     * @returns {Number}
     */
    get numOfTotal(){
        return facade.GetMapping(EntityType.User).total;
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
                if(msg.code == ReturnCode.Success){
                    console.log(`${this.options.serverType}.${this.options.serverId} logined`);
                    this.remoting.stamp = (new Date()).valueOf();
                    this.remoting.user = {stype: this.options.serverType, sid: this.options.serverId, socket: this.remoting};
                }
                else{
                    console.log(`${this.options.serverType}.${this.options.serverId} failed login`);
                }
            })
        });
    }
}

exports = module.exports = CoreOfLogic;