let facade = require('../../Facade')
let {SkillType, em_Effect_Name, em_Effect_Comm, em_EffectCalcType, mapOfTechCalcType} = facade.const
let {SkillStateEnum,conditionEnum, ProfessionType,SkillNameEnum,EmitType,OperationType,StatusOfActionExecute,PeriodTypeEnum,NotifyEnum,AttrChangedType,BattleBuffEnum,AttackMode,EnhanceMode,ActionTypeEnum,ActionExecuteResult} = require('./enum')
let EventEmitter = require('events').EventEmitter; //事件管理
let EffectManager = require('../comm/EffectManager');
let EffectObject= require('../comm/EffectObject');
let {OperationItem, BattleParam,BattleOperation,BaseBattleParam,ActionResultInfo} = require('./util')

/**
 * 五行相克系数表
 */
const natureConfig = [
    [1,     1,      1,      1,      1.5],
    [1,     1,      1.5,    0.5,    1],
    [1,     0.5,    1,      1.5,    1],
    [1,     1.5,    0.5,    1,      1],
    [1.5,   1,      1,      1,      1],
];

/**
 * 英雄属性集合，用于向客户端传递数据集
 */
class HeroAttributes
{
    constructor($a,$d,$dm,$h){
        this.a = $a;        //攻击力
        this.d = $d;        //生命值
        this.dm = $dm;      //最大生命值
        this.h =  $h;       //士气值
    }
}

/**
 * 战场中的英雄对象
 */
class BattleHero extends EventEmitter
{
    /**
     * 构造函数
     * @param {*} $id       英雄编号
     * @param {*} $level    英雄等级
     */
    constructor($id, $level){
        super();

        /**
         * 全局执行记录
         */
        this.globalRecord = {};
        /**
         * 单回合内执行记录
         */
        this.localRecord = {};
        /// <summary>
        /// 归属用户 BattleUser
        /// </summary>
        this._user = null; 
        /// <summary>
        /// 本回合内是否已行动
        /// </summary>
        this.Action = false;
        /// <summary>
        /// 座位号
        /// </summary>
        this.SiteNo = 0;
        /**
         * 前置动画句柄, 该英雄的所有后续动作，必须在该动画播放完毕后播放
         */
        this.PreCondition = 0;
        /**
         * 英雄的出生帧
         */
        this.BornCondition = 0;
        /**
         * 最新动画句柄，为其他英雄的锁帧函数提供默认输入
         */
        this.CurCondition = 0;                      
        /**
         * 伤害描述对象 BattleOperation
         */
        this.HurtObject = null; 
        /// <summary>
        /// 实时战斗参数，受各类Buff影响
        /// </summary>
        this._BattleParam = new BattleParam(this);
        /// <summary>
        /// 英雄ID
        /// </summary>
        this.id = $id;
        /**
         * 英雄等级
         */
        this.level = $level;
        /// <summary>
        /// 英雄名称
        /// </summary>
        this.name = "";
        /**
         * 技能列表 Dictionary<SkillType, ActionInfo>
         */
        this.actionList = {};

        this.registerEvents();

        //光环管理
        this.effectMgr = new EffectManager();       //置放于英雄自身的光环效果
        this.totalEffectMgr = new EffectManager();  //合并全局和自身光环后的最终效果
    }
    /**
     * @return {BattleParam}
     */
    get BattleParam(){
        return this._BattleParam;
    }
    set BattleParam(val){
        this._BattleParam = val;
    }
    /**
     * 新增技能
     * @param {*} params type, level
     */
    addSkill(...params){
        let $item = new ActionInfo(params[0], params[1], 0);
        this.actionList[$item.type] = $item;
    }
    /**
     * @return {BattleUser}
     */
    get user(){
        return this._user;
    }
    /**
     * @param {BattleUser} val
     * @return {BattleUser}
     */
    set user(val){
        this._user = val;
    }

    /**
     * 注册非技能类事件句柄
     */
    registerEvents(){
        //用户回合切换事件
        this.on(EmitType.CountChange, (...$params) =>{
            if(this.BattleParam.Defense > 0){
                this.Action = false; //复位存活英雄的行动标记
            }
            else{
                if(!this.checkBuff(BattleBuffEnum.Dead)){ //阵亡超过2回合的英雄离场
                    this.lockFrame(this.user.room.GlobalFrame).emit(EmitType.Disappear);
                }
                else{
                    this.BattleParam.BattleBuff.Decrease(BattleBuffEnum.Dead);
                }
            }
        });

        this.on(EmitType.QuSan, ()=>{
            this.removeBuff(BattleBuffEnum.UnabledAction);
            this.removeBuff(BattleBuffEnum.Confused);
            this.removeBuff(BattleBuffEnum.Dazed);
            this.removeBuff(BattleBuffEnum.Poisoned);
            this.removeBuff(BattleBuffEnum.Fire);
        });

        this.on(EmitType.Alive, ()=>{
            //移除濒死标志
            this.removeBuff(BattleBuffEnum.BeDead);
            //将生命值补满
            this.BattleParam.Defense = this.BattleParam.DefenseOfMax;
            //通知客户端发生了复活事件
            this.record(OperationType.Alive);
        });

        //英雄离场事件
        this.on(EmitType.Disappear, (...$params) => {
            this.removeEffectGlobal();        //清除全局光环
            //下发离场通知，强制锁定到全局帧
            this.record(OperationType.Disappear);

            this.user.HeroList[this.SiteNo] = null;
        });

        //濒死事件，发起求救
        this.on(EmitType.BeDead, (...$params) => {
            if(this.BattleParam.Defense <= 0){
                this.BattleParam.Defense = 1;//避免生命为0提前退出求救流程, 临时添加1点生命
            }
            this.act(SkillType.BeDead, $params[0]);
        });

        //英雄死亡事件
        this.on(EmitType.Dead, (...$params) => {
            this.removeBuff(BattleBuffEnum.BeDead);//消除濒死标记
            this.addBuff(BattleBuffEnum.Dead,1);   //添加死亡标志，持续1回合
            
            this.record(OperationType.Dead);       //向客户端发送阵亡通知
        });

        this.on(EmitType.SkillReady, (...$params) => {
            let ft = $params[0];
            if(!!this.globalRecord[ft]){
                this.globalRecord[ft] += 1;
            }
            else{
                this.globalRecord[ft] = 1;
            }
    
            if(!!this.localRecord[ft]){
                this.localRecord[ft] += 1;
            }
            else{
                this.localRecord[ft] = 1;
            }
            this.record(OperationType.Skill, {state:SkillStateEnum.Ready, type:ft});//自动添加技能发动记录（默认阶段0）
        });
    }

    /**
     * 英雄基本属性值：攻/血/血上限/气
     * @return {HeroAttributes}
     */
    get Attributes(){
        return  new HeroAttributes(
            this.BattleParam.Attack,
            this.BattleParam.Defense,
            this.BattleParam.DefenseOfMax,
            this.BattleParam.HonorValue,
        );
    }

    /**
     * 自身光环效果的计算公式，可直接返回effectMgr，也可根据底层层级汇总后返回。
     * @return {EffectManager}
     */
    effect(){
        return this.effectMgr;
    }

	/**
     * 当前的技能效果
     * @return {EffectManager}
     */
    get Effect(){
	    let st = [
            this.user,
            this
        ];
	    if(st.reduce((sofar, item)=>{ 
            if(!item){
                return sofar;
            }
            else{
                return sofar || item.effect().GetEffectChanged()
            }
        }, false)){
	        st.reduce((sofar, item)=>{ 
                return sofar.Add(item.effect());
            }, this.totalEffectMgr.Clear());
        }
        return this.totalEffectMgr;
    }

    /**
     * 向自身添加光环效果
     * @param {*}  $type
     * @param {*}  $value
     */
    addEffectLocal($type, $value){
        let $eo = new EffectObject($type, $value);
        this.effectMgr.AddItem($eo);
        this.record(OperationType.Effect, {type:$eo.type, value:$eo.value});
    }

    /**
     * 向全局添加光环效果
     * @param {*}  $type
     * @param {*}  $value
     */
    addEffectGlobal($type, $value){
        $value = this.valueOfLevel($type, $value);

        if(!this.localEffectCache){
            this.localEffectCache = {};
        }
        let $eo = new EffectObject($type, $value);
        this.user.effectMgr.AddItem($eo);
        if(!!this.localEffectCache[$type]){
            this.localEffectCache[$type] += $value;
        }
        else{
            this.localEffectCache[$type] = $value;
        }
        this.record(OperationType.Effect, {global:true, type:$eo.type, value:$eo.value});
    }

    /**
     * 光环类效果随等级提升的计算公式
     * @param {*} $type     光环效果类型  
     * @param {*} $value    光环效果初始值
     */
    valueOfLevel($type, $value){
        switch($type){
            case em_Effect_Comm.HAttack:
                $value = $value * (1 + this.level);
                break;
            case em_Effect_Comm.Sacrifice:
                $value = $value * (1 + this.level);
                break;

            default:
                $value = $value + ((this.level / 20)|0);
                break;
        }
        return $value;
    }
    
    /**
     * 清除全局光环中和自己有关的光环
     */
    removeEffectGlobal(){
        if(!!this.localEffectCache){
            Object.keys(this.localEffectCache).map(key=>{
                if(!!this.user.effectMgr.effectList[key]){
                    this.user.effectMgr.effectList[key].value -= this.localEffectCache[key];

                    if(this.user.effectMgr.effectList[key].value == 0){//清除数值为零的效果条目
                        delete this.user.effectMgr.effectList[key];
                    }
                }
            });
            this.localEffectCache = {};
        }
    }

    /**
     * 增加Combo值直至最大值
     */
    ComboAdd(){
        this.user.Combo = Math.min(this.user.user.player.core.ConfigMgr.ComboMax, this.user.Combo+1);
        this.record(OperationType.Combo, {value:this.user.Combo});
    }

    /**
     * 返回Combo是否已满的判断，如Combo已满，将其复位
     * @return {Boolean}
     */
    get ComboReady(){
        if(this.user.Combo >= this.user.user.player.core.ConfigMgr.ComboMax){
            this.user.Combo = 0;
            this.record(OperationType.ComboReady, {});
            return true;
        }
        return false;
    }

    /**
     * 属性：英雄标识数组
     * @return {Array}
     */
    get Index(){
        return [this.user.id, this.id, this.SiteNo];
    }

    /**
     * 设置新的前置动画句柄
     * @param {*} _con 
     * @return {BattleHero}
     */
	lockFrame(_con) {
		if(this.PreCondition < _con){
			this.PreCondition = _con;
        }
        return this;
    }

    /**
     * 设置并锁定到出生帧
     * @param {*} _con 
     * @return {BattleHero}
     */
    lockBornFrame(_con){
        this.BornCondition = _con;
        this.lockFrame(_con);
        return this;
    }
    
    /**
     * 添加英雄行为记录，攻击、防御
     * @param {*}  $operType
     * @param {*}  $params
     * @return 本次记录的唯一句柄
     */
    record($operType, $params = {}){
        this.CurCondition = this.user.room.GetEventHandle(); //自动记录最新帧

        $params.uid = this.user.id;     //用户编号
        $params.hid = this.id;          //英雄编号
        $params.site = this.SiteNo;     //英雄站位
        $params.sInfo = this.Index;

        let rec = new OperationItem($operType, $params);
        rec.PreCondition = this.PreCondition;
        rec.EventIndex = this.CurCondition;

        this.user.room.OperationList.push(rec);
        return rec.EventIndex;
    }

    /**
     * 发动一个技能
     * @param {*} $fid    技能编号
     * @param {BattleHero} $source  触发该技能的事件的主体
     * 
     * @note 目前系统设定的所有技能中，前55个技能的技能编号和技能类型保持一致，因此在系统内部，可以通过为act函数传递技能类型的方式，发动对应的技能
     */
    act($fid, $source=null){
        //2018.2.1 技能调整为必然发动，技能效果随等级提升，概率问题放入技能逻辑内部判断。
        //let $lv = this.GetActionLevel($fid);
        //if ($lv == -1 || (Math.random()*100 | 0) <= (33 + $lv * 2)) {//执行判定：先天技能（必定发动，如普攻等），或者后天技能经概率判定发动
        try{
            let si = this.user.user.player.core.ConfigMgr.skill($fid);
            let $ret = new si.builder($fid);
            $ret.hero = this;
            $ret.ori = $source;
            if ($ret.CanExecute.apply($ret)) {
                if(!!this.actionList[$fid]){
                    this.actionList[$fid].mature = this.user.CountVersion; //重新开始累计成熟度/CD
                }
                this.user.room.emit(EmitType.Action, $ret);
            }
        }
        catch(e)
        {
            console.error(e);
        }
        //}
    }

    /**
     * 判断技能是否成熟
     * @param {*} $type 技能类型
     * @return {Boolean}
     */
    isMature($type){
        return this.user.CountVersion >= this.actionList[$type].mature + this.Effect.CalcFinallyValue(em_Effect_Comm.Fee, this.user.user.player.core.ConfigMgr.skill($type).addon.fee);
    }

    /**
     * 发起通告
     * @param {*} $notifyEnum   通告的类型 
     * @param {BattleHero} $src 通告源
     */
    Notify($notifyEnum, $src = null){
        //仅测试
        //this.record(OperationType.Notify, {type:$notifyEnum, ori: !!$src ? $src.Index : null});

        //选取适配通告类型的、成熟了的技能
        let list = this.actionByNotify($notifyEnum);
        
        //region 2018.2.1 将原先只发动费用最高的技能的模式，调整为所有技能并发
        // if(list.length >= 1){
        //     // 选取其中费用最高的技能中的随意一个发动
        //     let maxFee = list.reduce((sofar,cur)=>{
        //         if(sofar < this.user.user.player.core.ConfigMgr.skill(cur).addon.fee){
        //             sofar = this.user.user.player.core.ConfigMgr.skill(cur).addon.fee;
        //         }
        //         return sofar;
        //     },0);
        //     let $af = list.reduce((sofar,cur)=>{
        //         if(this.user.user.player.core.ConfigMgr.skill(cur).addon.fee == maxFee){
        //             sofar.push(cur);
        //         }
        //         return sofar;
        //     },[]).randomElement()[0];

        //     this.act($af, $src);
        // }
        list.map(cur=>{
            this.act(cur, $src);
        });
        //end region 调整结束
    }

    /**
     * 检测Buff有效性
     */
    checkBuff($status){
        return this.BattleParam.BattleBuff.Check($status);
    }

    /**
     * 添加新的Buff，持续一定回合
     * @param {*} buff      Buff类型 
     * @param {*} count     持续回合数
     */
    addBuff(buff, count=1){
        let $old = this.BattleParam.BattleBuff.LeftCount(buff);
        this.BattleParam.BattleBuff.Increase(buff, count);
        let $new = this.BattleParam.BattleBuff.LeftCount(buff);
        if($old != $new){
            this.record(OperationType.BuffChanged, {type:buff, count:$new});
        }
    }

    /**
     * 移除Buff
     * @param {*} buff      Buff类型
     */
    removeBuff(buff){
        if(this.BattleParam.BattleBuff.LeftCount(buff)!=0){
            this.BattleParam.BattleBuff.UnSet(buff);
            this.record(OperationType.BuffChanged, {type:buff, count:this.BattleParam.BattleBuff.LeftCount(buff)});
        }
    }

    get X()
    {
        return (this.SiteNo / 3) | 0;
    }
    get Y()
    {
        return this.SiteNo % 3;
    }

    /**
     * 获取指定技能的等级
     * @param {*}  
     */
    GetActionLevel($ft){
        if (!!this.actionList[$ft]){
            return this.actionList[$ft].level;
        }
        return -1;
    }

    /**
     * 选取对指定触发类事件类型感兴趣的技能
     * @param {*}  $nt 指定的触发类事件类型
     * @return {[]}
     */
    actionByNotify($nt){
        return Object.keys(this.actionList).reduce((sofar, cur)=>{
            if(this.user.user.player.core.ConfigMgr.skill(cur).Notify.Check($nt) && this.isMature(cur)){
                sofar.push(cur);
            }
            return sofar;
        }, []);
    }

    isAnti($h2){
        return (this.curNature == 4 && $h2.checkBuff(BattleBuffEnum.AntiFire)) 
            || (this.curNature == 2 && $h2.checkBuff(BattleBuffEnum.AntiWood))
            || (this.curNature == 3 && $h2.checkBuff(BattleBuffEnum.AntiWater))
    }

    getAnti($h2){
        if((this.curNature == 4 && $h2.checkBuff(BattleBuffEnum.AntiFire)) ){
            return AttrChangedType.AntiFire;
        }
        else if((this.curNature == 2 && $h2.checkBuff(BattleBuffEnum.AntiWood)) ){
            return AttrChangedType.AntiWood;
        }
        else if((this.curNature == 3 && $h2.checkBuff(BattleBuffEnum.AntiWater)) ){
            return AttrChangedType.AntiWater;
        }
        return AttrChangedType.Miss;
    }

    /**
     * 攻击造成的伤害
     * @param {BattleHero} $h2  
     * @param {*} $aMode
     * @param {*} $HurtValuePercent
     * @return {BattleOperation}
     */
    calcDamageValue($h2, $aMode, $HurtValuePercent) {
        let $lostLife = new BattleOperation();

        if ($aMode == AttackMode.Counter || $aMode == AttackMode.Confusion){
            $lostLife.DamageValue = this.BattleParam.Attack;
            $lostLife.Type = AttrChangedType.Damage;
        }
        else if ($aMode == AttackMode.Blood){
            $lostLife.DamageValue = this.BattleParam.DefenseOfMax;
            $lostLife.Type = AttrChangedType.Damage;
        }
        else if(this.isAnti($h2)){
            $lostLife.DamageValue = 0;
            $lostLife.Type = this.getAnti($h2);
        }
        else{
            let $_Attack = this.BattleParam.Attack;
            let $_Tough = $h2.BattleParam.Tough;
            let $_Miss = $h2.BattleParam.Miss;
            let $_Parry = $h2.BattleParam.Parry;

            //圆桌概率
            let $BangValue = Math.min(Math.max(this.BattleParam.Bang - $_Tough, 0), 100);
            let $CatchValue = Math.min($BangValue + Math.max(this.BattleParam.Catch - $_Miss, 0), 100);
            let $ParryValue = Math.min($CatchValue + Math.max($_Parry - this.BattleParam.Wreck, 0), 100);

            let $BigPoint = (Math.random() * 100) | 0;

            if (this.checkBuff(BattleBuffEnum.Bang)/*英雄处于必暴状态*/ || $BigPoint <= $BangValue){ //发生了暴击
                //计算暴击强度
                $lostLife.DamageValue = (this.BattleParam.Attack * BattleParam.Intensity / 100.0) | 0;
                $lostLife.Type = AttrChangedType.Bang;
            }
            else if ($BigPoint <= $CatchValue){ //发生了普通击中
                $lostLife.DamageValue = this.BattleParam.Attack;
                $lostLife.Type = AttrChangedType.Damage;
            }
            else if ($BigPoint <= $ParryValue){ //发生了格挡
                if(!this.checkBuff(BattleBuffEnum.Sharp)){
                    $lostLife.DamageValue = (this.BattleParam.Attack * 0.5) | 0;
                    $lostLife.Type = AttrChangedType.Parry;
                }
                else{//破甲无视格挡
                    $lostLife.DamageValue = this.BattleParam.Attack;
                    $lostLife.Type = AttrChangedType.Damage;
                }
            }
            else{ //发生了闪避
                $lostLife.DamageValue = 0;
                $lostLife.Type = AttrChangedType.Miss;
            }
        }

        if (this.checkBuff(BattleBuffEnum.JiAng)){
            $lostLife.DamageValue *= 3;
        }

        $lostLife.DamageValue = this.Effect.CalcFinallyValue(em_Effect_Comm.HAttack, ($lostLife.DamageValue * $HurtValuePercent) | 0);

        //石头皮肤
        if ($h2.checkBuff(BattleBuffEnum.Stone)){
            if(!this.checkBuff(BattleBuffEnum.Sharp)){//破甲无视石头皮肤
                $lostLife.DamageValue = 50;
            }
        }

        $lostLife.DamageValue = Math.min($lostLife.DamageValue, $h2.BattleParam.Defense);

        //计算五行相克系数
        $lostLife.DamageValue *= this.getNature($h2);

        $lostLife.attackMode = $aMode;
        $lostLife.src = this;
        $lostLife.dst = $h2;

        $h2.HurtObject = $lostLife;
        this.HurtObject = $lostLife;

        if ($h2.checkBuff(BattleBuffEnum.Illusion)) {
            //是幻象，遭受攻击立即死亡
            $h2.BattleParam.Defense = 0;
        }
        else {
            $h2.BattleParam.Defense = ($h2.BattleParam.Defense - $lostLife.DamageValue) | 0;
        }

        return $lostLife;
    }

    /**
     * 计算五行相克系数：
     * 首先确定攻防英雄各自的五行属性，确定克制系数，金土互克，木水火循环相克，
     *      克制： * 1.5，统计各自阵营中同属性的英雄个数之和A，B=(A+2)/3，最终系数为 * 1.5 * B
     *      被克制 / 2，统计各自阵营中同属性的英雄个数之和A，B=(A+2)/3，最终系数为 / 2 / B
     * 
     * @param {*} $hero 敌对英雄
     */
    getNature($hero){
        let $A = Object.values(this.user.HeroList).filter(h=> !!h && h.nature == this.curNature).length + 
            Object.values($hero.user.HeroList).filter(h=> !!h && h.nature == $hero.nature).length;

        let $B = ($A + 2) / 3;

        let $C = natureConfig[Math.max(0,this.curNature-1)][Math.max(0, $hero.nature-1)];
        if($C > 1){
            return $C * $B;
        }
        else if($C < 1){
            return $C / $B;
        }
        else {
            return $C;
        }
    }

    /**
     * 是否处于虚弱状态
     * @return {Boolean}
     */
    isWeak(){
        return this.checkBuff(BattleBuffEnum.Poisoned)
        || this.checkBuff(BattleBuffEnum.Fire)
        || this.checkBuff(BattleBuffEnum.Confused)
        || this.checkBuff(BattleBuffEnum.UnabledAction)
        || this.checkBuff(BattleBuffEnum.Dazed) ;
    }

    /**
     * 克隆一位英雄
     * @param {BattleUser} $simUsesr 接收克隆英雄的玩家
     * @return {BattleHero}
     */
    CloneHero($simUser){
        if(!$simUser){
            $simUser = this.user;
        }

        let $_SiteNo = $simUser.getTargetLocation(this.user.user.player.core.ConfigMgr.PetList()[this.id].loc);
        if ($_SiteNo == -1){
            return null;
        }

        let $ho = new BattleHero(this.id, this.level);
        $ho.user = $simUser;
        $ho.SiteNo = $_SiteNo;

        $ho.name = this.name;
        $ho.profession = this.profession;//职业
        $ho.nature = this.nature;        //五行属性，金木水火土 12345
        $ho.combo = this.combo;          //Combo设定
        $ho.defaultAttackMode = this.defaultAttackMode;
        $ho.BattleParam.current.clone(this.BattleParam.current);
        $ho.BattleParam.Ori_Attack = this.BattleParam.Ori_Attack;
        $ho.BattleParam.Ori_Defense = this.BattleParam.Ori_Defense;

        for(let key in this.actionList){
            $ho.addSkill(this.actionList[key].type, this.actionList[key].level);
        }

        return $ho;
    }

    /**
     * 静态创建英雄对象
     * @param {BattleUser} $battleUser  拥有英雄的玩家
     * @param {int} $_SiteNo            英雄站位
     * @param {Pet} $hi                 携带英雄配置信息的对象
     * @param {int} $level              设定英雄的等级
     * @param {int} $star               设定英雄的星级
     * @param {Array} $skill            设定英雄的附加技能，用于主角英雄的创建
     * @return {BattleHero}
     */
    static CreateInstance($battleUser, $_SiteNo, $hi, $level, $star, $skill=[]){
        let $ho = new BattleHero($hi.id, $level);

        $ho.user = $battleUser;         //拥有者
        $ho.SiteNo = $_SiteNo;          //站位
        $ho.level = $level;             //等级

        $ho.name = $hi.name;            //名称
        $ho.profession = $hi.profession;//职业
        $ho.nature = $hi.nature;        //五行属性，金木水火土 12345
        $ho.BattleParam.Ori_Attack = parseInt($hi.attack);                 //攻击
        $ho.BattleParam.Ori_Defense = parseInt($hi.defense);               //物理防御
        $ho.combo = this.user.user.player.core.ConfigMgr.ProfessionList()[$hi.profession].combo;                                           //Combo设定
        $ho.defaultAttackMode = this.user.user.player.core.ConfigMgr.ProfessionList()[$hi.profession].attackMode;
        $ho.BattleParam.current.read(...this.user.user.player.core.ConfigMgr.ProfessionList()[$hi.profession].BP).multi((1+0.05*$level));  //荣誉值集合 - 使用配置表进行初始化

        //默认添加攻击、求生、混乱攻击技能，等级传入-1表示必然发动
        $ho.addSkill(SkillType.Attack, -1);
        $ho.addSkill(SkillType.BeDead, -1);
        $ho.addSkill(SkillType.ConfuseAttack, -1);

        //根据英雄技能列表添加相关技能
        $hi['ActionList'][$star-1].map($ai=>{
            let $itemInfo = $ai.split(',');
            let $it = $ai, $lv = 0;
            if ($itemInfo.length >= 2){
                $lv = $itemInfo[1]; //使用配置串中携带的等级信息
            }
            else{
                $lv = $level; //让技能等级取英雄等级
            }
            if (!!this.user.user.player.core.ConfigMgr.skill($it) && !$ho.actionList[$it]){
                $ho.addSkill($it, $lv);
            }
        });

        //添加外部注入的技能，仅用于主角英雄的创建过程中
        $skill.map(it=>{
            if (!!this.user.user.player.core.ConfigMgr.skill(it[0]) && !$ho.actionList[it[0]]){
                $ho.addSkill(it[0], it[1]);
            }
        });

        return $ho;
    }
}

/**
 * 携带战斗技能动态信息的数据集
 */
class ActionInfo
{
    /**
     * 构造函数
     * @param {*}  $type    类型 
     * @param {*}  $level   等级
     * @param {*}  $mature  CD
     */
    constructor($type, $level, $mature){
        this.type = $type;
        this.level = $level;
        this.mature = $mature;
    }
}

exports = module.exports = {
    HeroAttributes:HeroAttributes,
    BattleHero:BattleHero,
    ActionInfo:ActionInfo,         
}