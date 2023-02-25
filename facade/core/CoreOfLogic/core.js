/**
 * Updated by Administrator on 2017-11-29.
 */
let facade = require('../../Facade')
let CoreOfBase = facade.CoreOfBase
let {EntityType, ReturnCode, CommMode, ResType} = facade.const
let TaskObject = facade.Util.TaskObject
let LargeNumberCalculator = facade.Util.LargeNumberCalculator

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
            this.$mapping = ['CoreOfLogicIOS', 'CoreOfLogicAndroid'];
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
            this.initConnector("CoreOfIndex", 1);
        }).catch(e=>{
            throw e;
        });

        //活动检测
        this.autoTaskMgr.addCommonMonitor(fo=>{
            fo.service.activity.checkStatus();
            return false;
        });
        
        //用户活动信息载入        
        try {
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
    }

    /**
     * 当前总注册量
     * @returns {Number}
     */
    get numOfTotal(){
        return this.GetMapping(EntityType.User).total;
    }
}

exports = module.exports = CoreOfLogic;