let facade = require('../../../../Facade')
let {GuideList, UserStatus, NotifyType, TollgateState, ReturnCode} = facade.const
let baseMgr = facade.Assistant
let EffectManager = require('../../../../util/comm/EffectManager');

/**
 * VIP管理
 * @note
 *      1、选择商城商品列表中的VIP卡，使用现金直接购买
 *      2、VIP的有效期是30天，多买可以延长有效期
 *      3、VIP的奖励内容：
 *          1、能量回复 +8/小时
 *          2、每日额外奖励
 *          3、好友列表中，在常规的排序规则上，vip的玩家优先置顶，再按照原本的规则排序
 *
 * 探险关卡管理类，探险流程：
 * 1、客户端问询当前关卡信息
 * 2、客户端从当前关卡开始向前推图，永远进入最新关卡
 * 3、在到达关底时，客户端上行结果（本次挂机所用时长；挂机获得的所有金币数量），服务端校验确认并下发新的关卡信息。
 * 4、对于重要操作，客户端必须实时上行指令，以便服务端进行校验确认。
 *
 * @note：
 * 1、关卡时长受科技影响
 * 2、各种随机事件的触发
 */
class vip extends baseMgr
{
    /**
     * 构造函数
     * @param {UserEntity} parent 
     */
    constructor(parent) {
        super(parent, 'vip', 500);

        // 持久化数据
        this.v = {
            expire:0,           //有效期
            refresh:0,          //最新执行日期，用于标记每日奖励是否已经领取
            gate:{1:{n:0,s:0}}, //通关信息 {1:{n:102,s:1}} 表示第一关获得了102分1星
            gid:0,              //新手引导最新步骤
            aScore:0,           //活动排名
            aLv:0,              //活动分段等级
            aId:0,              //活动编号
        }

        // 技能效果
        this.effectMgr = new EffectManager();

        // 当前关卡数据，和this.v中的gate和hisGateNo一起，组成完整的关卡信息
        this.battle = {
            state: TollgateState.idle,    //战斗状态，0空闲 1战斗中 2扫荡中 3等待领取扫荡奖励
            id:0,       //当前关卡编号
            time:0,     //战斗开始时间
            bonus: []   //奖励内容 {type:0, id:0, num:0}
        }

        this.catchObj = null;
    }

    /**
     * 记录活动奖励领取情况，0表示检测排名奖，1及以上表示检测分段积分奖
     * @param $id
     */
    writeActivityBonus($id){
        this.dirty = true;
        this.v.act[$id] = true;
    }

    /**
     * 检测活动奖励领取情况，0表示检测排名奖，1及以上表示检测分段积分奖
     * @param $id
     * @returns {*}
     */
    readActivityBonus($id){
        return !!this.v.act[$id];
    }

    /**
     * 检测排名活动信息的有效性，并作可能的修复
     */
    checkActivityStatus(){
        if(this.v.aId != this.parent.core.service.activity.id){
            this.v.aId = this.parent.core.service.activity.id;
            this.v.aScore = 0;
            this.v.aLv = 0;
            this.v.act = {};

            this.dirty = true;
        }
    }

    /**
     * 存储参与活动的信息
     * @param {*}  
     * @param {*}  
     * @param {*}  
     */
    saveActivityInfo($id, $score, $lv){
        this.v.aId = $id;
        this.v.aScore = $score;
        this.v.aLv = $lv;

        this.dirty = true;
    }

    /**
     * 计算VIP技能效果
     * @returns {EffectManager}
     */
    effect(){
        if(this.effectMgr.GetEffectChanged()){
            this.effectMgr.Clear();
            if(this.valid){
                this.parent.core.fileMap.vip.skill.map(item=>{
                    this.effectMgr.Add(item.effect);
                });
            }
            this.effectMgr.SetEffectChanged(false);
        }
        return this.effectMgr;
    }

    /**
     * 获取当前技能效果列表
     * @returns {*}
     */
    getEffect(){
        return this.effect().effectList;
    }

    /**
     * VIP是否仍然有效
     * @returns {boolean}
     */
    get valid(){
        return !!this.v.expire && this.v.expire > facade.util.now();
    }

    /**
     * 返回VIP剩余持续时间，返回0表示已经失效
     */
    get time(){
        if(this.valid){
            return this.v.expire - facade.util.now();
        }
        else{
            return 0;
        }
    }

    /**
     * 延长VIP有效期
     * @param numOfDay
     */
    increase(numOfDay){
        let now = facade.util.now();
        if(!this.v.expire || this.v.expire < now){
            this.effectMgr.SetEffectChanged(true); //技能效果发生了变化
            this.v.expire = now + 3600*24*numOfDay;
        }
        else{
            this.v.expire = this.v.expire + 3600*24*numOfDay;
        }
        this.dirty = true;
    }

    async drawFirstPurchaseBonus(){
        let ret = {code:ReturnCode.vipBonusGot, data:{}};

        if(!this.parent.baseMgr.info.CheckStatus(UserStatus.isFirstPurchaseBonus)){
            this.parent.baseMgr.info.SetStatus(UserStatus.isFirstPurchaseBonus);

            ret.code = ReturnCode.Success;
            //从配置表取奖励字段，送出首充奖励
            ret.data.bonus = this.parent.core.fileMap.vip.firstPurchase;
            this.parent.getBonus(ret.data.bonus);
        }
        return ret;
    }

    /**
     * 领取每日奖励
     * @param {*} user 
     * @param {*} objData 
     */
    async drawDaily(){
        let ret = {code:ReturnCode.Success, data:{bonus:null, valid:this.valid, time:this.time}};

        if(this.valid){ //处于VIP有效期内
            if(this.parent.getActionMgr().Execute(this.parent.core.const.ActionExecuteType.vipDaily, 1, true)) {
                ret.data.bonus = this.parent.core.fileMap.vip.daily; //VIP每日奖励
                this.parent.getBonus(ret.data.bonus);
            }
            else{
                ret.code = ReturnCode.vipBonusGot;
            }
        }
        else{
            ret.code = ReturnCode.illegalData;
        }

        return ret;
    }

    /**
     * 领取七日奖励
     */
    draw(){
        let ret = {code:ReturnCode.Success, data:{bonus:null, valid:this.valid, time:this.time}};

        let cur = new Date();
        if(this.valid){ //处于VIP有效期内
            //一周七天，每天的奖励都不一样
            ret.data.bonus = this.parent.core.fileMap.vip.bonus[cur.getDay()].bonus;        //VIP每日奖励
        }
        else{
            //一周七天，每天的奖励都不一样
            ret.data.bonus = this.parent.core.fileMap.vip.bonus[cur.getDay()].normalBonus;  //普通玩家每日奖励
        }

        let day = cur.toLocaleDateString();
        if(day != this.v.refresh){
            this.v.refresh = day;
            this.dirty = true;
            this.parent.getBonus(ret.data.bonus);
        }
        else{
            ret.code = ReturnCode.vipBonusGot;
        }

        return ret;
    }

    /**
     * 利用来自持久化层的数据进行初始化
     * @note 子类可重载此方法
     */
    LoadData(val){
        super.LoadData(val);

        /**
         * the max tollgate number been ever arrived in history
         * 关卡编号从1开始
         */
        this.v.gid = this.v.gid || 0;
        this.guideId = this.v.gid;//暂存的新手引导步骤，条件满足时才会写入数据库
        this.v.aScore = this.v.aScore || 0;     //活动积分
        this.v.aLv = this.v.aLv || 0;           //活动积分等级
        this.v.aId = this.v.aId || 0;           //活动ID
        this.v.act = this.v.act || {};          //活动领奖记录
    }

    /**
     * 登录时检测并推送新手引导步骤编号，如果为0表示没有新的引导步骤
     */
    checkGuide(){
        if(!GuideList[this.guideId]){
            this.guideId = 0;
        }
        this.parent.notify({
            type: NotifyType.guide, 
            info: {gid:GuideList[this.guideId].next}
        });
    }
}

exports = module.exports = vip;
