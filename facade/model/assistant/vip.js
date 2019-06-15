let facade = require('../../../facade/Facade')
let {RecordType, GuideList, ActionExecuteType, ResType, UserStatus, NotifyType, ActivityType, em_Condition_Type, em_Condition_Checkmode, em_Effect_Comm, TollgateState, ReturnCode, OperEnum} = facade.const
let baseMgr = require('../baseAssistant');
let BonusObject = require('../../../facade/util/comm/BonusObject')
let EffectManager = require('../../../facade/util/comm/EffectManager');

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
        super(parent, 'vip');

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
                facade.config.fileMap.vip.skill.map(item=>{
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
            ret.data.bonus = facade.config.fileMap.vip.firstPurchase;
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
            if(this.parent.getActionMgr().Execute(ActionExecuteType.vipDaily, 1, true)) {
                ret.data.bonus = facade.config.fileMap.vip.daily; //VIP每日奖励
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
            ret.data.bonus = facade.config.fileMap.vip.bonus[cur.getDay()].bonus;        //VIP每日奖励
        }
        else{
            //一周七天，每天的奖励都不一样
            ret.data.bonus = facade.config.fileMap.vip.bonus[cur.getDay()].normalBonus;  //普通玩家每日奖励
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

    /**
     * 获取当前的新手引导步骤编号
     */
    get GuideNo(){
        return this.guideId;
    }
    /**
     * 设置当前的新手引导步骤编号
     */
    set GuideNo($val){
        if(typeof $val == 'string'){//强制类型转换
            $val = parseInt($val);
        }

        if($val > this.GuideNo){//完成了更高级的步骤
            this.guideId = $val;

            if(GuideList[this.guideId].rec){//本步骤需要立刻持久化保存
                this.v.gid = this.guideId;
                this.dirty = true;
            }
            if(!!GuideList[this.guideId].bonus){//本步骤有新手奖励
                let $bonus = GuideList[this.guideId].bonus;
                this.parent.getBonus($bonus);
                this.parent.notify({type: NotifyType.guideBonus, info: $bonus});
            }
        }
        this.parent.notify({
            type: NotifyType.guide, 
            info: {gid:GuideList[this.guideId].next}});
    }

    /**
     * 包装并返回客户端需要的关卡信息
     * @returns {}
     */
    toClient($gate){
        return {
            hisGateNo: this.parent.hisGateNo, 
            list: Object.keys(this.v.gate).map(key=>{
                return {
                    id: key,
                    star: this.v.gate[key].s,
                    score: this.v.gate[key].n,
                };
            }), 
            battle:{
                id: this.battle.id,
                state: this.battle.state,
                time: (this.battle.time == 0) ? 0 : $gate.time - facade.util.now() + this.battle.time,
            }
        };
    }

    /**
     * 延缓战斗结束时间
     */
    addTime(){
        switch(this.battle.state){
            case TollgateState.start:
                this.battle.time = facade.util.now(); //增加战斗持续时间
                break;
        }
    }

    /**
     * 检测扫荡数据
     */
    checkSweep(){
        if(this.battle.id > 0){
            switch(this.battle.state){
                case TollgateState.sweep:
                    {
                        let tm = facade.util.now() - this.battle.time;
                        let $gate = facade.config.fileMap.chapterdata[this.battle.id];//获取指定关卡的配置信息
                        //if(tm >= $gate.time)
                        //改为固定时长30秒
                        if(tm >= 30)
                        {
                            //扫荡时间到，自动结算
                            this.battle.state = TollgateState.bonus;
                            this.battle.time = 0;
                            //概率计算
                            if(Math.random() < facade.config.fileMap.constdata.dropRate){ //掉率计算
                                this.battle.bonus = BonusObject.convert($gate.award);
                            }
                            else{
                                this.battle.bonus = [];
                            }
                            this.battle.bonus.push({type: ResType.Gold, num:($gate.moneyplus*$gate.time*2.8)|0});
                        }
                    }
                    break;

                case TollgateState.start:
                    {
                        let tm = facade.util.now() - this.battle.time;
                        let $gate = facade.config.fileMap.chapterdata[this.battle.id];//获取指定关卡的配置信息
                        if(!$gate || tm >= 3*$gate.time){
                            //异常战斗，结束
                            console.log(`战斗异常结束, 耗时${tm}, ${this.parent.openid}, ${this.battle.id}` );
                            this.initBattle();
                        }
                    }
                    break;
            }
        }
    }

    /**
     * 登记抓捕/起义的目标好友
     * @param {*} friend 
     */
    registerSlaveBattle(friend){
        this.catchObj = friend;
    }

    initBattle(){
        this.battle.id = 0;
        this.battle.state = TollgateState.idle;
        this.battle.time = 0;
        this.catchObj = null; //清除缓存的待抓捕对象
    }

    startBattle($gate){
        this.battle.id = $gate.id;
        this.battle.state = TollgateState.start;
        this.battle.time = facade.util.now(); //当前时间
        
        //console.log(`战斗开始 ${this.parent.openid}, ${$gate.id}` );

        this.parent.baseMgr.info.SetStatus(UserStatus.gaming);
    }
    
    /**
     * 关卡主要操作处理句柄
     * @param $params
     * @returns {*}
     */
    doSomething($params) {
        if(!this.v.gate || this.v.gate.constructor != Object){
            this.v.gate = {};
        }

        let ret = {code: ReturnCode.Success, data:{}}; //返回值
        let $gateId = !!$params.id ? $params.id : this.parent.hisGateNo; //如果客户端有上行关卡号则取该关卡号，否则取历史最高关卡号
        let $gate = facade.config.fileMap.chapterdata[$gateId];//获取指定关卡的配置信息
        if(!$gate){
            return {code: ReturnCode.illegalGateId};
        }

        let ct = facade.util.now(); //当前时间

        switch ($params.oper) {
            case OperEnum.Start:{//开始游戏
                this.initBattle();

                //判断体力是否足够
                if(!!this.parent.core.options.debug || this.parent.baseMgr.item.GetRes(ResType.Action) >= $gate.costap) {
                    //每关单独配置体力消耗
                    this.parent.getBonus({type:ResType.Action, num:-$gate.costap});//扣减体力
                    
                    //特定任务检测
                    switch(this.parent.getInfoMgr().GetRecord(RecordType.Role)){
                        case 1002:
                            this.parent.core.notifyEvent('user.task', {user:this.parent, data:{type:em_Condition_Type.useRole1002, value:1}});
                            break;
                    }
                    switch(this.parent.getInfoMgr().GetRecord(RecordType.Scene)){
                        case 2002:
                            this.parent.core.notifyEvent('user.task', {user:this.parent, data:{type:em_Condition_Type.useScene2002, value:1}});
                            break;
                    }
                    
                    //缓存战斗信息
                    this.startBattle($gate);
                }
                else{
                    ret.code = ReturnCode.actionNotEnough; //体力不足
                }

                break;
            }

            case OperEnum.PassTollgate: {//客户端请求通关
                if(this.battle.state == TollgateState.idle){
                    ret.code = ReturnCode.toBeStarted; //尚未开始冲关
                }
                else if(this.battle.id != $gate.id){
                    ret.code = ReturnCode.illegalGateId; //关卡号不符
                    ret.data = {expect:this.battle.id, current:$gate.id};
                }
                else if(this.battle.state == TollgateState.bonus){
                    ret.code = ReturnCode.inBonus;
                }
                else if(this.battle.state == TollgateState.sweep){
                    ret.code = ReturnCode.inSweep;
                }
                else{
                    let tm = ct - this.battle.time;
                    if($params.blood == 0){
                        //region 任务检测
                        this.parent.core.notifyEvent('user.task', {user:this.parent, data:{type:em_Condition_Type.death, value:1}});
                        //endregion

                        this.dirty = true;

                        if(this.v.gate.constructor != Object){
                            this.v.gate = {};
                        }
                        if(!this.v.gate.hasOwnProperty($gate.id) || this.v.gate[$gate.id].constructor != Object){
                            this.v.gate[$gate.id] = {};
                        }

                        ret.data.id = $gate.id;

                        let _money = ($gate.moneyplus * $params.money*(1+$params.moneyRate)) | 0; //计算实际所得金币
                        ret.data.bonus = [];
                        ret.data.bonus.push({type: ResType.Gold, num: _money});

                        ret.data.score = ($params.score + parseInt($gate.basescore)) * (1 + $params.scoreRate) | 0; //得分

                        if(!this.v.gate[$gate.id].n){
                            this.v.gate[$gate.id].n = ret.data.score; //记录当前关卡最高分
                        }
                        else{
                            this.v.gate[$gate.id].n = Math.max(this.v.gate[$gate.id].n, ret.data.score); //记录当前关卡最高分
                        }

                        ret.data.star = 0;
                        ret.data.starM = this.v.gate[$gate.id].s;
                        ret.data.scoreM =  this.v.gate[$gate.id].n;

                        this.parent.getBonus(ret.data.bonus);   //发放奖励

                        //region 任务检测
                        this.parent.core.notifyEvent('user.task', {user:this.parent, data:{type:em_Condition_Type.totalMoney, value:_money}})
                        //endregion

                        this.parent.baseMgr.info.UnsetStatus(UserStatus.gaming);
                    }
                    else if(!this.parent.core.options.debug && tm < $gate.time){
                        ret.code = ReturnCode.timeTooShort;
                    }
                    else{
                        let resultOk = ($params.score<50 && $params.money<50) || ($params.score <= $gate.time * 10 && $params.money < $gate.time * 10);
                        if(resultOk){
                            this.dirty = true;

                            if(this.v.gate.constructor != Object){
                                this.v.gate = {};
                            }
                            if(!this.v.gate.hasOwnProperty($gate.id) || this.v.gate[$gate.id].constructor != Object){
                                this.v.gate[$gate.id] = {};
                            }

                            //计算用户总血量：最终生命 = 基础生命值 x 【（当前等级-1） + 生命成长系数 x 当前等级】^0.6
                            let fullBlood = 1000;
                            let ro = facade.config.fileMap.roledata[this.parent.getInfoMgr().GetRecord(RecordType.Role)];
                            if(!!ro){
                                let it = this.parent.getPocket().GetRes(ResType.Role, ro.id);
                                if(!!it){
                                    fullBlood = (ro.basehp * Math.pow(it.lv - 1 + ro.hprate * it.lv, 0.6)) | 0;
                                }
                            }

                            ret.data.id = $gate.id;
                            let rate = Math.min(1, $params.blood / fullBlood);
                            if(rate >= 0.9){
                                ret.data.star = 3; //评星
                            }
                            else if(rate >= 0.6){
                                ret.data.star = 2; //评星
                            }
                            else{
                                ret.data.star = 1; //评星
                            }

                            //计算实际所得金币
                            let _money = this.parent.effect().CalcFinallyValue(
                                em_Effect_Comm.MoneyAdded, 
                                ($gate.moneyplus * $params.money*(1+$params.moneyRate)) | 0
                            ) | 0;

                            if(this.goAhead($gate)){//首次通关奖励
                                ret.data.firstBonus = BonusObject.convert($gate.firstaward);
                                ret.data.bonus = [];
                                if($gate.id % 10 == 0){
                                    //关卡首次通过逢10关卡系统公告
                                    this.parent.core.control.chat.sendChat(this.parent,{id:11,c:"1",name:this.parent.name,gateId:$gate.id,system:1});
                                }
                            }
                            else{
                                if(Math.random() < ($params.bonusRate + facade.config.fileMap.constdata.dropRate)){ //掉率计算
                                    ret.data.bonus = BonusObject.convert($gate.award);
                                }
                                else{
                                    ret.data.bonus = [];
                                }
                            }
                            ret.data.bonus.push({type: ResType.Gold, num: _money});
                            let cur = new Date();
                            let allow = (cur.getHours() < 14 && cur.getHours() >= 12) ? true : false;     //只有12-14点可获得活动道具
                            if(allow){
                                //活动预热期间随机获得1-3个活动道具
                                ret.data.bonus.push({type: ResType.Item, id:702,num: Math.ceil(Math.random()*3)});
                            }  
                            ret.data.score = ($params.score + parseInt($gate.basescore)) * (1 + rate) * (1 + $params.scoreRate) | 0; //得分

                            if(!this.v.gate[$gate.id].n){
                                this.v.gate[$gate.id].n = ret.data.score; //记录当前关卡最高分
                            }
                            else{
                                this.v.gate[$gate.id].n = Math.max(this.v.gate[$gate.id].n, ret.data.score); //记录当前关卡最高分
                            }

                            let oldStar = !!this.v.gate[$gate.id].s ? this.v.gate[$gate.id].s : 0;
                            if(!this.v.gate[$gate.id].s){
                                this.v.gate[$gate.id].s = ret.data.star; //记录当前关卡最高星
                            }
                            else{
                                this.v.gate[$gate.id].s = Math.max(this.v.gate[$gate.id].s, ret.data.star); //记录当前关卡最高星
                            }

                            if(this.v.gate[$gate.id].s > oldStar){
                                this.parent.core.notifyEvent('user.task', {user:this.parent, data:{type:em_Condition_Type.gateStar, value:this.v.gate[$gate.id].s - oldStar}});
                            }

                            ret.data.starM = this.v.gate[$gate.id].s;
                            ret.data.scoreM =  this.v.gate[$gate.id].n;

                            if($params.super == 1){//计算超越奖励
                                this.superBonus = ret.data.superBonus = this.parent.getTxFriendMgr().getRandomBonus(false);
                            }

                            if(!!ret.data.firstBonus){
                                this.parent.getBonus(ret.data.firstBonus);   //发放首次过关奖励
                            }
                            this.parent.getBonus(ret.data.bonus);   //发放通关奖励
                            //过关时技能带来的体力奖励，目前由客户端计算并上传
                            facade.notifyEvent('user.redAdd', {user:this.parent, data:{type:ResType.Action, value:$params.action, max:false}})

                            //region 任务检测
                            this.parent.core.notifyEvent('user.task', {user:this.parent, data:[
                                {type:em_Condition_Type.totalRound, value:1},
                                {type:em_Condition_Type.totalMoney, value:_money}
                            ]});
                            //endregion

                            //累计分段积分
                            this.parent.core.service.activity.addScore(this.parent.id, ActivityType.Gate, 1);

                            this.parent.baseMgr.info.UnsetStatus(UserStatus.gaming);
                        }
                        else{
                            ret.code = ReturnCode.illegalScore;
                        }
                    }

                    //清除战斗信息
                    //console.log(`战斗正常结束，${this.parent.openid}, ${this.battle.id}`);
                    this.initBattle();
                }

                break;
            }

            case OperEnum.Sweep: {//扫荡, 注意扫荡是自动完成、自动结算并主动推送下行消息的
                switch(this.battle.state){
                    case TollgateState.sweep:
                        ret.code = ReturnCode.inSweep;
                        break;
                    case TollgateState.bonus:
                        ret.code = ReturnCode.inBonus;
                        break;
                    case TollgateState.start:
                    default:
                        //判断体力是否足够
                        if(this.parent.baseMgr.item.GetRes(ResType.Action) < $gate.costap)
                        {
                            ret.code = ReturnCode.actionNotEnough; //体力不足
                        }
                        else{
                            this.parent.getBonus({type:ResType.Action, num:-$gate.costap});//扣减体力
                            
                            this.battle.id = $gate.id;
                            this.battle.state = TollgateState.sweep;
                            //this.battle.time = ct;
                            this.battle.time = 30; //改为固定时长
                        }
                        break;
                }
                break;
            }

            case OperEnum.SweepBonus:{  //领奖
                switch(this.battle.state){
                    case TollgateState.bonus:
                        this.parent.getBonus(this.battle.bonus);
                        ret.data = this.battle.bonus;
                        this.initBattle();
                        break;

                    case TollgateState.idle:
                        ret.code = ReturnCode.toBeStarted;
                        break;

                    case TollgateState.sweep:
                        ret.code = ReturnCode.inSweep;
                        break;

                    case TollgateState.start:
                        ret.code = ReturnCode.inBattle;
                        break;
                }
                break;
            }

            case OperEnum.Require: {//查询进度
                ret.data = this.toClient($gate);
                break;
            }

            case OperEnum.StartEscape:
            {//开始起义的战斗
                this.battle.id = 0;
                this.battle.state = TollgateState.idle;
                this.battle.time = 0;

                if(!!this.catchObj){
                    if($gate.id + 1 >= this.catchObj.hisGateNo) { //实际挑战关卡低于被挑战者的历史最高
                        this.parent.getActionMgr().Execute(ActionExecuteType.AE_SlaveEscape, 1, true); //扣除起义次数

                        //缓存战斗信息
                        this.startBattle($gate);
                    }
                    else{
                        ret.code = ReturnCode.illegalGateId;
                    }
                }
                else{
                    ret.code = ReturnCode.slaveBattleNotRegister;
                }

                break;
            }

            case OperEnum.StartCatch: 
            {//开始抓捕的战斗
                this.battle.id = 0;
                this.battle.state = TollgateState.idle;
                this.battle.time = 0;

                if(!!this.catchObj){
                    if($gate.id + 1 >= this.catchObj.hisGateNo) { //实际挑战关卡低于被挑战者的历史最高
                        this.parent.getActionMgr().Execute(ActionExecuteType.AE_SlaveCatch, 1, true); //扣除抓捕次数

                        //缓存战斗信息
                        this.startBattle($gate);
                    }
                    else{
                        ret.code = ReturnCode.illegalGateId;
                    }
                }
                else{
                    ret.code = ReturnCode.slaveBattleNotRegister;
                }

                break;
            }

            case OperEnum.Catch: {//客户端请求通关
                let $msg = {
                    type: NotifyType.slaveCatched,
                    info: {
                        src: this.parent.openid, 
                        dst: this.catchObj.openid, 
                        code: ReturnCode.Success,
                    }
                };

                if(this.battle.state == TollgateState.idle){
                    $msg.info.code = ReturnCode.toBeStarted; //尚未开始冲关
                }
                else if(this.battle.id != $gate.id){
                    $msg.info.code = ReturnCode.illegalGateId; //关卡号不符
                    $msg.info.expect = this.battle.id;
                    $msg.info.current = $gate.id;
                }
                else if(this.battle.state == TollgateState.bonus){
                    $msg.info.code = ReturnCode.inBonus;
                }
                else if(this.battle.state == TollgateState.sweep){
                    $msg.info.code = ReturnCode.inSweep;
                }
                else if(!this.catchObj){//找不到抓捕对象
                    $msg.info.code = ReturnCode.socialSimUserNotExist; 
                }
                else{
                    let tm = ct - this.battle.time;
                    if($params.blood == 0){//抓捕失败
                        $msg.info.code = ReturnCode.socialCatchFailed;
                    }
                    else if(!this.parent.core.options.debug && tm < $gate.time){
                        $msg.info.code = ReturnCode.timeTooShort;
                    }
                    this.parent.baseMgr.info.UnsetStatus(UserStatus.gaming);

                    //清除战斗信息
                    //console.log(`战斗正常结束，${this.parent.openid}, ${this.battle.id}`);
                    this.initBattle();
                }

                //向自己下行抓捕消息
                this.parent.socialNotify($msg);
                if($msg.info.code == ReturnCode.Success){
                    //向好友发送抓捕消息（成功）
                    this.parent.socialNotify($msg, $msg.info.dst);
                }

                break;
            }

            case OperEnum.Escape: {//客户端请求通关
                let $msg = {
                    type: NotifyType.slaveEscaped,
                    info: {
                        src: this.catchObj.openid, 
                        dst: this.parent.openid, 
                        code: ReturnCode.Success,
                    }
                };

                if(this.battle.state == TollgateState.idle){
                    $msg.info.code = ReturnCode.toBeStarted; //尚未开始冲关
                }
                else if(this.battle.id != $gate.id){
                    $msg.info.code = ReturnCode.illegalGateId; //关卡号不符
                    $msg.info.expect = this.battle.id;
                    $msg.info.current = $gate.id;
                }
                else if(this.battle.state == TollgateState.bonus){
                    $msg.info.code = ReturnCode.inBonus;
                }
                else if(this.battle.state == TollgateState.sweep){
                    $msg.info.code = ReturnCode.inSweep;
                }
                else{
                    let tm = ct - this.battle.time;
                    if($params.blood == 0){
                        //逃跑失败
                        $msg.info.code = ReturnCode.socialEscapeFailed;

                        //群发游戏状态
                        this.parent.baseMgr.info.UnsetStatus(UserStatus.gaming);
                    }
                    else if(!this.parent.core.options.debug && tm < $gate.time){
                        $msg.info.code = ReturnCode.timeTooShort;
                    }
                    else{
                        //逃跑成功

                        //群发游戏状态
                        this.parent.baseMgr.info.UnsetStatus(UserStatus.gaming);
                    }

                    //清除战斗信息
                    //console.log(`战斗正常结束，${this.parent.openid}, ${this.battle.id}`);
                    this.initBattle();
                }

                //向自己发送消息
                this.parent.socialNotify($msg);
                if($msg.info.code == ReturnCode.Success){
                    //向好友发送消息（成功）
                    this.parent.socialNotify($msg, $msg.info.src);
                }

                break;
            }
        }
        return ret;
    }

    /**
     * 进入下一个关卡
     */
    goAhead($gate) {
        if($gate.id == this.parent.hisGateNo){
            let nextGateId = parseInt(this.parent.hisGateNo) + 1;
            if(!!facade.config.fileMap.chapterdata[nextGateId]){//进入下一关
                this.parent.hisGateNo = nextGateId;
                this.parent.core.notifyEvent('user.task', {user:this.parent, data:{
                    type:em_Condition_Type.gateMaxNo, 
                    value:$gate.id, 
                    mode:em_Condition_Checkmode.absolute}
                });
                
                return true;
            }
        }
        return false;
    }
}

exports = module.exports = vip;
