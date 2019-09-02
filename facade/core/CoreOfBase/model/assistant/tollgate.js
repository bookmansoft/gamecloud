let StateMachine = require('javascript-state-machine')
let facade = require('../../../../Facade')
let {NotifyType, EntityType, PurchaseType, em_Condition_Checkmode, em_Condition_Type, ResType, TollgateConstant, StayStatus, EventEnum, TollgateType, em_Effect_Comm, ReturnCode, OperEnum} = facade.const
let baseMgr = facade.Assistant
let LargeNumberCalculator = facade.Util.LargeNumberCalculator
let OperationInfo = require('../../../../util/tollgate/OperationInfo')
let TollgateObject = require('../../../../util/tollgate/TollgateObject')
let TollgateHangup = require('../../../../util/tollgate/TollgateHangup')
let CheckValid = require('../../../../util/mixin/CheckValid')

/*
 * 探险关卡管理类，探险流程：
 * 1、客户端登录时，服务端下发当前关卡信息
 * 2、客户端从当前关卡开始，开始持续不断的挂机
 * 3、在到达关底时，客户端上行挂机结果，服务端校验确认并下发新的关卡信息。挂机结果包括：胜负信息；本次挂机所用时长；挂机获得的所有金币数量
 * 4、在任何和金币、魂石有关的操作之前，客户端也要上行挂机结果，以便服务端进行校验确认。
 *
 * 部分准备工作：
 * 1、准确计算当前关卡怪物总数量，它受科技影响
 * 2、准确计算当前关卡总血量，它受科技影响
 * 3、每次校验通过时，记录校验时间点，以便在下次提交时计算本次战斗时长，Boss关还要做超时判断
 * 4、根据本次战斗时长、本次消灭怪物数量、当前关卡怪物总数量和总血量，折算成单位时间消灭血量，和战力比对是否在合理范围内。
 * 5、校验通过后，计算本次掉落物，包括金币和魂石，其中魂石按概率出现，但当前关未通过时要缓存概率计算结果。可获取魂石数量要下发给客户端
 */
class tollgate extends baseMgr
{
    constructor(parent){
        super(parent, 'Tollgate');

        /**
         * 当前关卡信息
         */
        this.current = {
            gid:1,                          //关卡编号
            curMonsterNum:0,                //剩余怪物，需要持久化
            bossId:0,                       //Boss编号，需要缓存以重入，需要持久化
            dropStone:0,                    //关卡可掉落魂石，需要缓存以重入，需要持久化
        };

        /**
         * 上一次校验的时间点
         */
        this.startTime = facade.util.now();
        /**
         * 如果是Boss关卡，该字段纪录战斗失效时间
         * 如果处于挂机状态，该字段表示剩余挂机时间
         */
        this.ExpiredTime = facade.util.now() + 60;
        /**
         * 离线收益，一旦计算后就累计在这里
         * @var {LargeNumberCalculator}
         */
        this.moneyOffline;
        /**
         * 累计的重生（转生）次数
         * @var int
         */
        this.revivalNum = 0;
        /**
         * 目前可使用的重生次数
         * @var int
         */
        this.revivalLeftNum = 0;
    }

    /**
     * 当前关卡怪物总数
     * @var int
     */
    get totalMonster(){
        return this.curGate.totalMonster;
    }

    /**
     * 当前关卡的怪物总血量
     */
    get totalBlood(){
        return this.curGate.totalBlood;
    }

    /**
     * 当前关卡对象
     */
    get curGate(){
        if(!this.current.gate){
            this.current.gate = TollgateObject.instance(this.curGateNo, this.parent);//获取指定关卡的配置信息
        }
        return this.current.gate;
    }

    /**
     * current Tollgate number
     * 关卡编号从1开始
     */
    get curGateNo(){
        return this.current.gid;
    }
    set curGateNo(val){
        //数据校验
        val = Math.max(1, val);
        //判断数据是否真实改变
        if(this.current.gid == val){
            return;
        }

        this.dirty = true;
        this.current.gid = val;
        this.current.gate = TollgateObject.instance(this.current.gid, this.parent);//获取指定关卡的配置信息
        //设定开始及超时的时间戳
        this.startTime = facade.util.now();
        this.ExpiredTime = this.startTime + 60;
        this.curMonsterNum = 0;

        //首次通关检定
        if(this.curGateNo > this.parent.hisGateNo) { 
            //纪录最新通关关卡，以便生成排行榜
            this.parent.hisGateNo = this.curGateNo;

            if(this.curGate.GateType == TollgateType.BigGate){
                //圣光奖励（首次过关）, 包括了宠物特技增加的圣光
                this.parent.getBonus({type:ResType.Potential, num:this.parent.effect().CalcFinallyValue(em_Effect_Comm.PotentialOutput20, 1)});
                let msg = {
                    type:NotifyType.mail, 
                    info:{
                        content:`恭喜您通过了第${this.curGateNo}关`,
                        bonus: [{type:ResType.Diamond, num:1}],
                    }
                };
                this.parent.core.GetMapping(EntityType.Mail).Create(this.parent, msg, "system", this.parent.openid);
            }
        }
    }

    /**
     * 当前已被消灭的怪物
     * curGateNo 和 curMonsterNum 合起来组成 checkpoint(校验点)
     */
    get curMonsterNum(){
        return this.current.curMonsterNum;
    }
    set curMonsterNum(val){
        this.current.curMonsterNum = val;
    }
    
    /**
     * 本关的bossID，系统据此判断属性相克
     */
    get bossId() {
        if(this.current.bossId == 0) {
            this.current.bossId = this.curGate.bossId;
        }
        return this.current.bossId;
    }
    set bossId(val){
        this.current.bossId = val;
    }

    /**
     * 当前关卡可掉落的魂石数量，在进入时计算并存储，过关时发放
     * @var int
     */
    get dropStone(){
        if(this.current.dropStone == 0){ //之前没有缓存的可掉落魂石数值
            //缓存可掉落魂石数值，该数据一旦产生，将可以在下次进入该关卡时复用
            this.current.dropStone = this.curGate.dropStone;
        }
        return this.current.dropStone;
    }
    set dropStone(val){
        this.current.dropStone = val;
    }

    /**
     * 反序列化任务数据
     * @param {*} $params
     */
    LoadData($params){
        this.moneyOffline = new LargeNumberCalculator(0, 0);

        let $status = 0;
        if(!!$params){
            let $arr = $params.split(',');
            if($arr.length >= 12){
                this.current.gid = parseInt($arr[0]);
                if(!!$arr[1] && $arr[1] != '0'){
                    $status = $arr[1]; //从数据库读取初始状态
                }
                this.curMonsterNum = parseInt($arr[3]);
                this.setTimeStamp(parseInt($arr[5]) - parseInt($arr[4]), parseInt($arr[4]));
                this.moneyOffline = new LargeNumberCalculator(parseFloat($arr[6]), parseInt($arr[7]));
                this.dropStone = parseInt($arr[8]);         //缓存的可掉落魂石数量
                this.revivalNum = parseInt($arr[9]);        //重生累计次数
                this.revivalLeftNum = parseInt($arr[10]);   //可用重生次数
                this.refreshTime = parseInt($arr[11]);
            }
            if($arr.length >= 13){
                this.bossId = parseInt($arr[12]);
            }
            else{
                this.bossId = 0;
            }
        }

        //创建管理过关状态的状态机
        this.tollgateStatus = new StateMachine({
            init: $status || StayStatus.newArrival,      //设置初始状态
            transitions: [
                { name: 'ahead', from: [StayStatus.newArrival, StayStatus.goBack],  to: StayStatus.newArrival },    //过关
                { name: 'rollback', from: StayStatus.newArrival,  to: StayStatus.goBack },       //回退，攻击Boss失败时发生
                { name: 'doHangup', from: [StayStatus.newArrival, StayStatus.goBack], to: StayStatus.hangup },        //开始挂机
                { name: 'endHangup', from: StayStatus.hangup, to: StayStatus.newArrival },                          //结束挂机
                { name: 'revival', from: [StayStatus.newArrival, StayStatus.goBack], to: StayStatus.newArrival },   //重生，分为普通重生和高级重生
            ],
            methods: {
                onRevival:function(event, $params, $adv){
                    this.env.dirty = true;

                    //重生累计次数+1，剩余次数-1
                    this.env.revivalNum += 1;
                    this.env.decRevivalLeftNum(true);
            
                    //所有魂石立刻转化为英魂
                    $params.stoneHero = this.env.parent.getPocket().GetRes(ResType.Stone);
                    this.env.parent.getBonus([
                        {type:ResType.StoneHero, num: $params.stoneHero}, 
                        {type:ResType.Stone, num: -$params.stoneHero}
                    ]);
                    
                    if(!$adv){
                        //当前关卡归一
                        this.env.curGateNo = this.env.parent.effect().CalcFinallyValue(em_Effect_Comm.RevivalStartGate, 1)
            
                        //设定挂机时长
                        this.env.setTimeStamp(3600*3);//todo 走配置表
            
                        //金币归于初始值
                        this.env.parent.getPocket().SetRes(this.env.parent.effect().CalcFinallyValue(em_Effect_Comm.RevivalStartMoney, 100000), ResType.Gold);
            
                        //宠物等级归一
                        this.env.parent.getPotentialMgr().RevivalCPet();
            
                        //法宝等级归一
                        this.env.parent.getPotentialMgr().RevivalTech();
                    }
                    else{
                        //todo：立刻获取到大量的魂石，数值需要走配置表
                        this.env.parent.getBonus({type:ResType.Stone, num:1000});
            
                        //todo：刷出大量的宠物碎片，数值需要走配置表
                        this.env.parent.getBonus({type:ResType.PetChipHead, id:facade.util.rand(1,25), num:10});
                    }
                },
                onRollback:function(event){
                    this.env.dirty = true;
                    switch(this.env.curGate.GateType){
                        case TollgateType.BigGate:
                        case TollgateType.MediumGate:
                            //后退回上一关
                            this.env.curGateNo -= 1;
                            this.env.curMonsterNum = this.env.totalMonster; //进入无计数挂机模式
                            break;
            
                        default:
                            //弹回关卡开头
                            this.env.curMonsterNum = 0;
                            break;
                    }
                },
                onDoHangup:function(event,id,type){
                    this.env.dirty = true;
                    this.env.parent.purchase(PurchaseType.hangUp, 1, true);//扣除元宝

                    let $func = TollgateHangup.getHangUpEndPoint();
                    this.env.setTimeStamp(($func(this.env.parent.hisGateNo) - this.env.curGateNo) * TollgateHangup.seconds);
                },
                onAhead:function(event,$params){
                    //任务条件发生变化
                    this.env.parent.getTaskMgr().Execute(em_Condition_Type.tollgatePass, 1, em_Condition_Checkmode.add);
            
                    if(this.env.curGate.GateType != TollgateType.SmallGate){
                        this.env.parent.getTaskMgr().Execute(em_Condition_Type.attackBoss, 1, em_Condition_Checkmode.add);
                    }
            
                    switch(this.env.curGate.GateType) {
                        case TollgateType.BigGate://击败大Boss
                            if(this.env.dropStone > 0){ //将先前缓存的可掉落魂石兑现
                                this.env.parent.getBonus({type:ResType.Stone, num:this.env.dropStone});
                            }
                            //宠物特技增加的金币：
                            let newMoney = this.env.totalBlood._clone_().CalcFinallyValue(this.env.parent.effect(), [em_Effect_Comm.MoneyOutput20])._sub_(this.env.totalBlood);
                            $params.money._add_(newMoney); 
                            this.env.parent.getPocket().AddRes(newMoney, true, ResType.Gold);
                            break;
                    }
                    //以上都是针对刚刚通过的历史关卡，进行判定

                    this.env.curGateNo += 1;

                    switch(this.env.curGate.GateType){
                        case TollgateType.SmallGate:
                            this.bossId = 0;        //清除之前缓存的bossId
                            this.dropStone = 0;    //清除之前缓存的可掉落魂石
                            break;
                    }
                },
                onEndHangup:function(event, $diamond){
                    this.env.dirty = true;
                    if($diamond){ //完成全部挂机任务
                        let $func = TollgateHangup.getHangUpEndPoint();
                        this.env.curGateNo = $func(this.env.parent.hisGateNo);
                    }
                    else{ //提前终止挂机任务
                        let $func = TollgateHangup.getHangUpEndPoint();
                        if(this.env.ExpiredTime > facade.util.now()){
                            this.env.curGateNo = $func(this.env.parent.hisGateNo) - (this.env.ExpiredTime - facade.util.now()) / TollgateHangup.seconds;
                        }
                        else{
                            this.env.curGateNo = $func(this.env.parent.hisGateNo);
                        }
                    }
                    
                    //计算挂机结束时获取的宠物碎片：
                    let $totalChip = this.env.parent.effect().CalcFinallyValue(em_Effect_Comm.PetChipDropNum, this.env.curGateNo/50); //获取到的宠物碎片总数
                    while($totalChip > 0){
                        //逐个发放随机碎片
                        this.env.parent.getBonus({type:ResType.PetChipHead, id:facade.util.rand(1, 25), num:1});
                        $totalChip--;
                    }
                    //计算挂机结束时获取的金币：
                    //。。。
            
                    //计算挂机结束时获取的魂石：
                    //。。。
                }
            }
        });
        this.tollgateStatus.env = this; //将关卡管理对象注入状态机作为外部环境对象
    }

    /**
     * 设定新的时间戳
     * @param null $e
     * @param null $s
     */
    setTimeStamp($e = null, $s = null){
        this.startTime = $s == null ? facade.util.now() : $s;
        this.ExpiredTime = $e == null ? this.startTime + 40 : this.startTime + $e;
    }
    /*
    * 对象序列化
    */
    ToString(){
        return this.curGateNo  + ','
        +this.tollgateStatus.state + ','
        +'0,'
        +this.curMonsterNum + ','
        +this.startTime + ','
        +this.ExpiredTime + ','
        +this.moneyOffline.base + ','
        +this.moneyOffline.power + ','
        +this.dropStone + ','
        +this.revivalNum + ','
        +this.revivalLeftNum + ','
        +this.refreshTime + ','
        +this.bossId;
    }

    /**
     * 探险例程，支持链式操作
     * @param {OperationInfo} $params
     *
     * @noet：格林威治时间转北京时间 date("Y-m-d H:i:s", time() + 8*3600)
     * @todo
     * 1、离线收益的准确计算
     * 2、重生的处理
     * 3、各种随机事件的触发
     * 4、挂机处理：
     *      1、普通重生、回到第一关后，系统纪录一个挂机点，用户可以花费一定元宝、进入挂机状态
     *      2、当到达挂机点后，或者用户提前结束挂机时，将结束挂机状态，从已确认的校验点开始，进入正常的冲关状态。
     *      3、在到达挂机点之前，用户随时可以花费一定元宝、重新进入挂机状态
     *      4、挂机状态下，除结束挂机外、不接受任何用户操作。客户端和服务端按照一个时间节奏推进关卡进度，以服务端为准。
     *      5、挂机状态下，服务端不必实时计算各类收益，仅仅简单下行当前关卡数、挂机结束时间即可。在自动或手动结束挂机流程时，一次性计算全部收益。
     */
    doSomething($params)
    {
        //对上行参数做适当校验
        $params.Oper = parseInt($params.Oper);
        $params.monsterNum = Math.min(parseInt($params.monsterNum), this.totalMonster);
        
        this.refresh();//刷新离线收益。离线收益包括体力的自动恢复、等待用户领取的离线金币

        let $curTime = facade.util.now();

        this.errorCode = ReturnCode.Success;

        //客户端提交新的校验点（当前关卡编号、当前消灭的怪物数量）请求服务端校验，分为如下几种情况：
        //1.1、通过了一个小关，上行确认后进入下一个关卡，如校验失败，回滚到上一次校验点
        //1.2、通过了一个大关，上行确认后进入下一个关卡，如校验失败，后退到上一个关卡，进行无计数挂机
        //2、攻打大关超时，上行确认后，后退到上一个关卡，进行无计数挂机
        //3、在挂机过程中进行了消费，先上行当前校验点请求校验，如校验成功，纪录新的校验点并下发金币存量，否则回滚到上一次校验点
        //4、新登录，请求同步关卡信息，同时结算挂机收益
        //5、在无计数挂机状态下，上行当前校验点请求校验，并请求攻打下一个大关Boss
        //6、领取离线收益
        switch($params.Oper){
            case OperEnum.GetOfflineMoney: //领取离线收益
            {
                //任务条件发生变化
                this.parent.getTaskMgr().Execute(em_Condition_Type.offlineBonus, 1, em_Condition_Checkmode.add);

                this.dirty = true;

                $params.money._add_(this.moneyOffline); //返回本次领取的离线收益
                this.parent.getPocket().AddRes(this.moneyOffline, true, ResType.Gold); //为用户添加离线收益
                this.moneyOffline.zero(); //清空之前缓存的离线收益

                break;
            }

            case OperEnum.Require: //查询进度
            {
                break;
            }

            case OperEnum.Expired: //超时未取得胜利
            {
                if(this.tollgateStatus.can('rollback')){
                    this.tollgateStatus.rollback();
                }
                break;
            }

            case OperEnum.Attack: //重新申请攻击Boss
                if(this.tollgateStatus.can('ahead')){
                    this.tollgateStatus.ahead($params);
                    break; //此处跳出switch
                }
                //否则，当作普通的通关请求，程序继续向下执行

            case OperEnum.Continue: //临时提交新的校验点
            case OperEnum.PassTollgate: //客户端请求通关，包括大小关卡两种情形
            {
                this.dirty = true;
                
                //计算所获金币数量:0.5 * 新取得的进度/总进度 * 当前关卡总血量
                let $rate = ($params.monsterNum - this.curMonsterNum) * 0.5 / this.totalMonster;
                $params.money = this.totalBlood._clone_()._mul_($rate)
                    .CalcFinallyValue(this.parent.effect(), [em_Effect_Comm.MoneyOutput]) //计算科技对金币的加成
                ;
                //接受新的校验点
                this.curMonsterNum = $params.monsterNum;

                if(facade.util.rand(0, 99) < this.parent.effect().CalcFinallyValue(em_Effect_Comm.TenMultiMoney, 0.1)*100){ //十倍金币
                    $params.money._mul_(10);
                }
                this.parent.getPocket().AddRes($params.money, true, ResType.Gold); //为用户添加在线收益
                
                if(this.tollgateStatus.state == 'goBack' && $params.monsterNum == this.totalMonster){
                    this.curMonsterNum = 0;//无限挂机状态下，进度完成时重置进度
                    $params.monsterNum = 0;
                }

                if(this.CheckPartial($params)){
                    //核查消灭的怪物数量
                    if($params.monsterNum >= this.totalMonster && this.tollgateStatus.can('ahead')){
                        //进阶到下一个关卡
                        this.tollgateStatus.ahead($params);
                    }
                    this.errorCode = ReturnCode.Success;
                }

                break;
            }

            case OperEnum.Revival: //重生
            {
                this.CheckValid(() => {
                    let $func = TollgateHangup.getHangUpStartPoint();
                    if(this.curGateNo < $func(this.revivalNum)){//没有达到挂机允许的最小关卡数
                        return ReturnCode.paramError;
                    }
                    if(!this.tollgateStatus.can('revival')){
                        return ReturnCode.paramError;
                    }
                    return ReturnCode.Success;
                }).CheckValid(() => {
                    if(!this.decRevivalLeftNum()){
                        return ReturnCode.NotEnough_Num;
                    }
                    return ReturnCode.Success;
                }).Success(() => {
                    if(this.tollgateStatus.can('revival')){
                        this.tollgateStatus.revival($params, false);
                    }
                });
                break;
            }

            case OperEnum.AdvRevival: //高级重生
            {
                this.CheckValid(() => {
                    let $func = TollgateHangup.getHangUpStartPoint();
                    if(this.curGateNo < $func(this.revivalNum) || !this.tollgateStatus.can('revival')){//没有达到挂机允许的最小关卡数
                        return ReturnCode.paramError;
                    }
                    return ReturnCode.Success;
                }).Success(() => {
                    this.tollgateStatus.revival($params, true);
                });
                break;
            }

            case OperEnum.Hangup: //挂机
            {
                this.CheckValid(() => {
                    if(!this.tollgateStatus.can('doHangup')){//已经是挂机状态了
                        return ReturnCode.paramError;
                    }
                    return ReturnCode.Success;
                }).CheckValid(() => {
                    let $func = TollgateHangup.getHangUpEndPoint();
                    if(this.curGateNo >= $func(this.parent.hisGateNo)){//超过了挂机允许的最大关卡数
                        return ReturnCode.paramError;
                    }
                    return ReturnCode.Success;
                }).CheckValid(() => {
                    if(!this.parent.purchase(PurchaseType.hangUp, 1, false)) {//挂机所需消耗的元宝不足
                        return ReturnCode.NotEnough_Diamond;
                    }
                    return ReturnCode.Success;
                }).Success(() => {
                    if(this.tollgateStatus.can('doHangup')){
                        this.tollgateStatus.doHangup();
                    }
                });

                break;
            }

            case OperEnum.InteruptHangup: //立即中断挂机
            {
                this.CheckValid(() => {
                    if(!this.tollgateStatus.can('endHangup')){ //当前不在挂机状态
                        return ReturnCode.paramError;
                    }
                    return ReturnCode.Success;
                }).Success(() => {
                    this.tollgateStatus.endHangup(false);
                });

                break;
            }

            case OperEnum.EndHangup: //使用元宝，提前结束挂机
            {
                let $revivalDiamond = ((this.ExpiredTime - $curTime)/3600) | 0;
                this.CheckValid(() => {
                    if(!this.tollgateStatus.can('endHangup')){ //当前不在挂机状态
                        return ReturnCode.paramError;
                    }
                    return ReturnCode.Success;
                }).CheckValid(() => {
                    if(!this.parent.purchase(PurchaseType.EndHangup, $revivalDiamond, false)){ //结束挂机所需元宝不足
                        return ReturnCode.NotEnough_Diamond;
                    }
                    return ReturnCode.Success;
                }).Success(() => {
                    if(this.ExpiredTime > $curTime){
                        this.parent.purchase(PurchaseType.EndHangup, $revivalDiamond, true);
                    }
                    this.tollgateStatus.endHangup(true);
                });

                break;
            }
        }
        
        //传出操作结果码
        $params.errorCode = this.errorCode;

        return this;
    }

    /**
     * 核查用时长短 假定英雄出手速度最大5 PVE宠物出手速度最大45，根据普攻、普攻速度、点攻、点攻速度以及时长，计算最终合理伤害上限
     * @param {OperationInfo} $params 
     */
    _checkTimeValid($params){
        let el = []; //克制Boss的科技列表

        if(this.curGate.GateType == TollgateType.MediumGate || this.curGate.GateType == TollgateType.BigGate){ //Boss关卡
            if(this.ExpiredTime < facade.util.now()){//所用时间太长
                if(this.tollgateStatus.can('rollback')){
                    this.tollgateStatus.rollback();
                }
                return ReturnCode.gate_BattleExpired;
            }

            //计算属性相克
            let bs = this.parent.core.fileMap.MonsterList[this.bossId];
            if(!!bs){
                switch(parseInt(bs.trait)){
                    case 1: el = [em_Effect_Comm.AttackToGold, em_Effect_Comm.AttackToAll]; break;
                    case 2: el = [em_Effect_Comm.AttackToWood, em_Effect_Comm.AttackToAll]; break;
                    case 3: el = [em_Effect_Comm.AttackToWater, em_Effect_Comm.AttackToAll]; break;
                    case 4: el = [em_Effect_Comm.AttackToFire, em_Effect_Comm.AttackToAll]; break;
                    case 5: el = [em_Effect_Comm.AttackToEarth, em_Effect_Comm.AttackToAll]; break;
                }
            }
        }

        /*计算战斗本次提交造成的总伤害*/
        let $blood = this.totalBlood._clone_()._mul_(($params.monsterNum - this.curMonsterNum) / this.totalMonster); 
        //本次战斗用时
        let $span = facade.util.now() - this.startTime;
        //本次战斗过程中，可造成的理论最大伤害值
        let $act = this.parent.getClickPower()._mul_(45).CalcFinallyValue(this.parent.effect(), el) //点击伤害，考虑了属性克制
            ._add_(this.parent.getPower()._mul_(5))  //主角伤害
            ._mul_($span);

        if($act._compare_($blood) == -1){//所用时间太短
            if(this.tollgateStatus.can('rollback')){
                this.tollgateStatus.rollback();
            }
            return ReturnCode.gate_TimeToShort;
        }

        return ReturnCode.Success;
    }

    /**
     * 临时提交检测点时的合理性检测
     * @param {OperationInfo} $params
     * @return {Boolean}
     */
    CheckPartial($params)
    {
        this.CheckValid(() => {
            if($params.monsterNum < this.curMonsterNum){
                return ReturnCode.paramError;
            }
            return ReturnCode.Success;
        }).CheckValid(() => {
            return this._checkTimeValid($params);
        });

        return ReturnCode.Success == this.errorCode;
    }

    /**
     * 返回当前离线收益
     * @return {LargeNumberCalculator}
     */
    getMoneyOffline()
    {
        return this.refresh().moneyOffline;
    }

    refresh(){
        if(this.tollgateStatus.can('endHangup') && this.ExpiredTime <= facade.util.now()){
            //挂机时间到了
            this.tollgateStatus.endHangup(false);
        }

        if(!this.refreshTime){
            this.refreshTime = facade.util.now();
        }

        //计算随时间获取的收益，同步推进刷新时间
        let $unitTimer = this.parent.CalcResult(em_Effect_Comm.RecoverAction, TollgateConstant.CheckTimer);//恢复一点体力所需时间
        let $allTime = facade.util.now() - this.refreshTime;
        if($allTime > $unitTimer){//每隔一个时间间隔检测一次, 该时间间隔将受科技影响
            this.dirty = true;

            //可用时长
            let $_times = $allTime / $unitTimer;
            let $useTime = $_times * $unitTimer;

            //离线一小时以上才会有离线金币收益，如果在线一直刷新则不会产生
            if($useTime > 3600){
                this.moneyOffline._add_(
                    LargeNumberCalculator.Load(new LargeNumberCalculator(TollgateConstant.UnitOfflineMoney, this.curGateNo - 1))
                        ._mul_($useTime).CalcFinallyValue(this.parent.effect(), [em_Effect_Comm.OfflineBonus])
                );
            }

            this.refreshTime += $useTime; //推进刷新时间
        }
        return this;
    }

    /**
     * 增加可用重生次数
     */
    addRevivalLeftNum() {
        if(this.revivalLeftNum < TollgateConstant.ReviveMaxTime){
            this.revivalLeftNum++;
            this.dirty = true;
        }
    }

    /**
     * 扣减可用重生次数，返回操作成功与否标志
     * @return bool
     */
    decRevivalLeftNum($exe = false) {
        if(this.revivalLeftNum > 0){
            if($exe){
                this.revivalLeftNum--;
                this.dirty = true;
            }
            return true;
        }
        else{
            return false;
        }
    }
}

facade.tools.mixin(tollgate, CheckValid);

exports = module.exports = tollgate;
