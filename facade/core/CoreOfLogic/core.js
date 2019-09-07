/**
 * Updated by Administrator on 2017-11-29.
 */
let facade = require('../../Facade')
let CoreOfBase = facade.CoreOfBase
let {serverType, EntityType, ReturnCode, CommMode, ResType} = facade.const
let TaskObject = facade.Util.TaskObject
let LargeNumberCalculator = facade.Util.LargeNumberCalculator
let socketClient = require('socket.io-client')

/**
 * 逻辑服对应的门面类
 */
class CoreOfLogic extends CoreOfBase 
{
    constructor($env){
        super($env);

        //载入数据库表
        this.loadingList = [
            EntityType.User,            //载入用户
            EntityType.Ally,            //载入联盟信息
            EntityType.AllyNews,        //载入联盟新闻
            EntityType.Mail,            //载入邮件
            EntityType.BuyLog           //载入消费日志
        ];

        //遍历静态配置表，载入全部任务
        Object.keys(this.fileMap.task).map($k=>{
            //创建新对象
            let $taskObj = new TaskObject();
            $taskObj.id = $k;
        
            //从静态配置表中取条件阈值和奖励信息
            $taskObj.loadFromStatic(this);
        
            //将对象放入任务列表
            this.TaskStaticList[$taskObj.id]= $taskObj;
        });

        /**
         * 角色升级配置表
         */
        this.upgradeChip = {1: Math.ceil(this.fileMap.constdata.getRoleNum.num)};
        for(let j = 2; j <= 30; j++) {
            this.upgradeChip[j] = this.upgradeChip[1];
            for(let i = 2; i <= j; i++){
                this.upgradeChip[j] = Math.ceil(this.upgradeChip[j] + this.fileMap.constdata.debrisConumRate.num * (i-1));
            }
        }

        //注册商品处理句柄
        this.RegisterResHandle(ResType.VIP, async (user, bonus) => {
            //VIP有效期，做特殊处理
            user.baseMgr.vip.increase(bonus.num);
        });
        this.RegisterResHandle(ResType.FellowHead, async (user, bonus) => {
            //直接购买宠物，而非碎片合成
            user.getPotentialMgr().ActiveCPet(bonus.id, false);
        });
        this.RegisterResHandle(ResType.ActionHead, async (user, bonus) => {
            //购买技能
            user.getPotentialMgr().ActionAdd(bonus.id, 1);
            user.getPotentialMgr().Action(bonus.id);
        });
        this.RegisterResHandle(ResType.Gold, async (user, bonus) => {
            //大数型虚拟币，将num作为指数
            user.getPocket().AddRes(LargeNumberCalculator.instance(1, bonus.num), false, ResType.Gold); //可以超过上限
        });
        this.RegisterResHandle('$default', async (user, bonus) => {
            //不属于特殊物品的普通物品
            if(bonus.type == ResType.PetChipHead && bonus.id == 0){//特殊逻辑：生成随机碎片 2017.7.13
                let rate = Math.random() /*随机数*/, cur = 0/*记录累计概率*/;
                for(let rid of Object.keys(user.core.fileMap.HeroList)) {
                    cur += parseFloat(user.core.fileMap.HeroList[rid].rate); //从角色表中获取掉率并进行累计
                    if(rate < cur) { //本次随机数小于累计概率，找到符合条件的碎片
                        bonus.id = (parseInt(rid) + 1).toString(); 
                        break;
                    }
                }
            } 

            //添加资源
            user.getPocket().AddRes(bonus.num, false, bonus.type, bonus.id); //可以超过上限
        });
    }

    /**
     * 映射自己的服务器类型数组，提供给核心类的类工厂使用
     * @returns {Array}
     */
    static get mapping() {
        if(!this.$mapping) {
            this.$mapping = ['IOS', 'Android'];
        }
        return this.$mapping;
    }
    static set mapping(val) {
        this.$mapping = val;
    }

    /**
     * 自启函数
     * @param {*} app 
     */
    async Start(app){
        super.Start(app);

        //加载持久化层的数据
        console.time(`Load Db On ${this.constructor.name}`);
        await this.service.activity.loadDb(); //首先载入活动信息，后续的用户积分信息才能顺利注册

        Promise.all(this.loadingList.map(it=>this.GetMapping(it).loadAll())).then(()=>{
            console.timeEnd(`Load Db On ${this.constructor.name}`);
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
            let ret = await this.models.User(this.options.mysql).findAll();
            for(let i = 0; i++; i < ret.length){
                let pUser = await this.GetObject(EntityType.User, ret[i].id);
                //载入玩家的活动参与信息
                if(pUser.getVipMgr().v.aId > 0){
                    this.service.activity.setScore(pUser, pUser.getVipMgr().v.aId, pUser.getVipMgr().v.aScore, pUser.getVipMgr().v.aLv);
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
        return this.GetMapping(EntityType.User).total;
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
                    console.log(`${this.options.serverType}.${this.options.serverId} failed login: ${msg.code}`);
                }
            })
        });
    }
}

exports = module.exports = CoreOfLogic;