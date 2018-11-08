let facade = require('../../Facade')
let {SkillType, em_Effect_Name, em_Effect_Comm, em_EffectCalcType, mapOfTechCalcType} = facade.const
let {SkillStateEnum, conditionEnum, ProfessionType,SkillNameEnum,EmitType,OperationType,StatusOfActionExecute,PeriodTypeEnum,NotifyEnum,AttrChangedType,BattleBuffEnum,AttackMode,EnhanceMode,ActionTypeEnum,ActionExecuteResult} = require('./enum')
let {BattleHero} = require('./hero');
let BattleUser = require('./player');
let StatusManager = require('./StatusManager')
let {BattleParam,BattleOperation,BaseBattleParam,ActionResultInfo} = require('./util')

/**
 * 配置管理. 技能配置模式描述如下：
 * 1、技能类型，定义于数组 FunctionList 中，通过关联一个行为类构造函数，确定了该类型的基本行为规范
 * 2、技能，定义于配置文件 skillList 中，每个技能关联一个明确的技能类型，并为之配置了发动时机、攻击方式等附加参数
 * 3、卡牌：定义于配置文件 HeroList 中，卡牌分为英雄卡和符文，通过 boot 和 ActionList 和技能相关联，
 *      其中 boot 指定和英雄卡相关联的召唤技能的编号，ActionList则罗列了该卡牌自身拥有的技能列表
 */
const ConfigMgr = { 
    /**
     * Combo发动阈值
     */
    ComboMax: 2,
    /**
     * 恢复技能系数
     */
    baseRecoverValue: 0.1,
    /**
     * 鼓舞技能系数
     */
    baseEncourageValue: 5,
    /**
     * 攻击提升技能系数
     */
    baseAttackValue: 0.05,
    /**
     * 职业配置表
     */
    ProfessionList: function(){ 
        if(ConfigMgr._ProfessionList == null) {
            ConfigMgr._ProfessionList = {};
            facade.config.fileMap.professionList.map(it=>{
                let $combo = it.combo.split(',');
                let $attackMode = it.attackMode.split(',');
                ConfigMgr._ProfessionList[it.id] = {
                    BP: it.BP.split(','),
                    attack: (...params)=>{return params[0]*it.attack | 0},
                    defense: (...params)=>{return params[0]*it.defense | 0},
                    combo: [parseInt($combo[0]), parseFloat($combo[1])],
                    attackMode: [parseInt($attackMode[0]), parseFloat($attackMode[1])],
                };
            });
        }
        return ConfigMgr._ProfessionList;
    },
    /**
     * 技能类型配置表 
     *      映射 SkillType 和 ActionOfFunction，参数：技能类型、订阅事件列表  、发动前提条件、构造函数句柄
     */
    FunctionList: function(){
        if(ConfigMgr._FunctionList == null){
            ConfigMgr._FunctionList = {};
            [
                //先天技能
                {funcType:SkillType.Attack, CanExecute: function(){return true;}, builder:ActionOfAttack.prototype.constructor},
                {funcType:SkillType.BeDead, CanExecute:function(){return true;}, builder:ActionOfBeDead.prototype.constructor},
                {funcType:SkillType.ConfuseAttack, CanExecute:function(){return true;}, builder:ActionOfConfuseAttack.prototype.constructor},
                {funcType:SkillType.Counter, CanExecute:function(){
                    return this.hero.HurtObject != null
                        && this.hero.HurtObject.attackMode != AttackMode.Counter
                        && this.hero.HurtObject.attackMode != AttackMode.Confusion;
                }, builder:ActionOfCounter.prototype.constructor},
                //先天技能  结束

                {funcType:SkillType.AddDeBuff, CanExecute:function(){return true;}, builder:ActionOfAddDeBuff.prototype.constructor},
                {funcType:SkillType.BloodRecover, CanExecute:function(){return true;}, builder:ActionOfBloodRecover.prototype.constructor},
                {funcType:SkillType.XueZhou, CanExecute:function(){
                    return this.hero.BattleParam.Defense > (0.9 * this.hero.BattleParam.DefenseOfMax);
                }, builder:ActionOfXueZhou.prototype.constructor},
                {funcType:SkillType.DongCha, CanExecute:function(){return true;}, builder:ActionOfDongCha.prototype.constructor},
                {funcType:SkillType.Study, CanExecute:function(){return true;}, builder:ActionOfStudy.prototype.constructor},
                {funcType:SkillType.Insight, CanExecute:function(){return true;}, builder:ActionOfInsight.prototype.constructor},
                {funcType:SkillType.JianCi, CanExecute:function(){return true;}, builder:ActionOfJianCi.prototype.constructor},
                {funcType:SkillType.Enchant, CanExecute:function(){
                    //是否有空位符合召唤的条件
                    return !!this.hero.HurtObject.dst && this.user.getTargetLocation(ConfigMgr.PetList()[this.hero.HurtObject.dst.id].loc) != -1;    
                }, builder:ActionOfEnchant.prototype.constructor},
                {funcType:SkillType.Alive, CanExecute:function(){
                    return !this.limit([[conditionEnum.globalLimit,1]]); //限制使用频次：全局最多1次
                }, builder:ActionOfAlive.prototype.constructor},
                {funcType:SkillType.Illusion, CanExecute:function(){
                    return this.user.getTargetLocation(ConfigMgr.PetList()[this.hero.id].loc) != -1;    //是否有空位符合召唤的条件
                }, builder:ActionOfIllusion.prototype.constructor},
                {funcType:SkillType.XianJi, CanExecute:function(){return true;}, builder:ActionOfXianJi.prototype.constructor},
                {funcType:SkillType.LiZhi, CanExecute:function(){
                    return this.user.ReBornCount > 0;   //待复活英雄数大于零
                }, builder:ActionOfLiZhi.prototype.constructor},
                {funcType:SkillType.Unity, CanExecute:function(){
                    return this.user.getTargetHeros(this.hero, AttackMode.Our).length > 1;
                }, builder:ActionOfUnity.prototype.constructor},

                {funcType:SkillType.IncreaseAura, CanExecute:function(){return true;}, builder:ActionOfIncreaseAura.prototype.constructor},
                {funcType:SkillType.IncreaseLocal, CanExecute:function(){return true;}, builder:ActionOfIncreaseLocal.prototype.constructor},
                
                //重整技能：在PeriodStart之前发动
                {funcType:SkillType.Recover, CanExecute:function(){return true;}, builder:ActionOfRecover.prototype.constructor},
                {funcType:SkillType.Encourage, CanExecute:function(){return true;}, builder:ActionOfEncourage.prototype.constructor},
                {funcType:SkillType.AddBuff, CanExecute:function(){return true;}, builder:ActionOfAddBuff.prototype.constructor},
                {funcType:SkillType.GodBless, CanExecute:function(){return true;}, builder:ActionOfGodBless.prototype.constructor},
                {funcType:SkillType.QuSan, CanExecute:function(){return true;}, builder:ActionOfQuSan.prototype.constructor},
                {funcType:SkillType.Attach, CanExecute:function(){return true;}, builder:ActionOfAttach.prototype.constructor},
                {funcType:SkillType.Summon, CanExecute:function(){
                    return this.user.getTargetLocation(ConfigMgr.PetList()[this.addon.hid].loc) != -1;    //是否有空位符合召唤的条件
                }, builder:ActionOfSummon.prototype.constructor},
                {funcType:SkillType.Blood, CanExecute:function(){return true;}, builder:ActionOfBlood.prototype.constructor},
            ].map(item=>{
                ConfigMgr._FunctionList[item.funcType] = item;
            });
        }
        return ConfigMgr._FunctionList;
    },
    /**
     * 技能类型检索函数
     * @return {ActionOfSkill}
     */
    func: function($type) {
        return ConfigMgr.FunctionList()[$type];
    },
    /**
     * 技能配置表
     */
    SkillList:function(){
        if(!ConfigMgr.$SkillList){
            ConfigMgr.$SkillList = {};
            
            facade.configration.skillList.map(it=>{
                let fi = ConfigMgr.func(it.tid);
                if(!!fi){ 
                    //从技能类型对象中，复制部分属性
                    it.funcType = fi.funcType;
                    it.CanExecute = fi.CanExecute;
                    it.builder = fi.builder;
                }

                //解析配置信息中的发动时机字段
                let $change = 0;
                it.change.split(',').map(val=>{
                    val = parseInt(val);
                    if(val != -1){
                        $change |= 1 << val;
                    }
                });
                it.Notify = new StatusManager($change);
                it.attackMode = parseInt(it.attackMode);
                //解析组合附加信息对象
                let $bv = JSON.parse(it.baseValue);
                it.addon = Object.assign({nature: parseInt(it.nature), fee:parseInt(it.fee)}, $bv);
                if(!!it.addon.type){
                    it.addon.type = parseInt(it.addon.type);
                }
                if(!!it.addon.val){
                    it.addon.val = parseInt(it.addon.val);
                }
                if(!!it.addon.sid){
                    it.addon.sid = parseInt(it.addon.sid);
                }
                if(!!it.addon.hid){
                    it.addon.hid = parseInt(it.addon.hid);
                }

                ConfigMgr.$SkillList[it.id] = it;
            });
        }
        return ConfigMgr.$SkillList;
    },
    /**
     * 可用于顿悟的技能列表
     */
    randomSkillList: function(){
        if(!ConfigMgr.$randomSkillList){
            ConfigMgr.$randomSkillList = Object.keys(ConfigMgr.SkillList()).filter(id=>{
                let $id = parseInt(id);
                return $id > 11 && $id != 101;
            });
        }
        return ConfigMgr.$randomSkillList;
    },
    /**
     * 技能检索函数
     */
    skill: function($id){
        return ConfigMgr.SkillList()[$id];
    },
    /**
     * 卡牌配置表
     */
    PetList: function(){
        //id 编号，type 卡牌类型, loc 站位, ActionList 后天技能, 格式："技能ID,技能等级;..."
        if(!ConfigMgr._PetList){
            ConfigMgr._PetList = facade.configration.HeroList.reduce((sofar, cur) => {
                //对数据做一些预处理
                cur.loc = cur.locStr.split(',');
                cur.boot = parseInt(cur.boot);
                cur.profession = parseInt(cur.profession);
                cur.nature = parseInt(cur.nature);
                cur.attack = parseInt(cur.attack);
                cur.defense = parseInt(cur.defense);
                cur.ActionList = [];
                cur.ActionList.push(cur.action1.split(';').reduce((sofar,cur)=>{sofar.push(cur);return sofar;},[]));
                cur.ActionList.push(cur.action2.split(';').reduce((sofar,cur)=>{sofar.push(cur);return sofar;},[]));
                cur.ActionList.push(cur.action3.split(';').reduce((sofar,cur)=>{sofar.push(cur);return sofar;},[]));
                cur.ActionList.push(cur.action4.split(';').reduce((sofar,cur)=>{sofar.push(cur);return sofar;},[]));
                cur.ActionList.push(cur.action5.split(';').reduce((sofar,cur)=>{sofar.push(cur);return sofar;},[]));
            
                sofar[cur.id] = cur; 
                return sofar;
            }, {});
        }
        return ConfigMgr._PetList;
    },
};

/**
 * 事务对象
 */
class ActionObject {
    /**
     * 构造函数
     * @param {BattleHero} $hi  
     */
    constructor($hi = null){
        this.hero = $hi;
        /**
         * 事务类型
         */
        this.type = ActionTypeEnum.None;
        /**
         * 技能类型（仅技能类事务）
         */
        this.funcType = SkillType.PeriodOfUserControl;
        /**
         * 技能编号（仅技能类事务）
         */
        this.funcId = 0;
        /**
         * 标识事务执行流程的状态值
         */
        this.Status = StatusOfActionExecute.Start;
    }
    /**
     * 技能发动附加判定，可带入英雄当前状态
     * @return {Function} Function<BattleHero, Boolean>
     */
    get CanExecute(){
        return this._CanExecute;
    }
    /**
     * 设置技能发动附加判定
     * @param {Function} val
     */
    set CanExecute(val){
        this._CanExecute = val;
    }
    /**
     * 发动事务的武将 
     * @return {BattleHero}
     */
    get hero(){
        return this._hero;
    }
    set hero(val){
        this._hero = val;
    }

    /**
     * 获取上层事务产生的待处理的模拟输入，清除对象链接使其不可再次被访问
     */
    getResult(){
        let ret = this.resultInfo;
        this.resultInfo = null;//消除该模拟输入以免引起无限循环
        return ret;
    }

    /**
     * 上层事务是否产生了待处理的模拟输入
     */
    hasResult(){
        return !!this.resultInfo && this.resultInfo.succ;
    }

    /**
     * 缓存待处理的事务信息
     * @param {BattleHero} $hi  
     * @param {*} $result  
     */
    cacheResult($hi, $result){
        this.resultInfo = new ActionResultInfo();
        this.resultInfo.succ = true;
        this.resultInfo.uo = $hi;
        this.resultInfo.Result = $result;
    }

    /**
     * 立即发送事务信息
     * @param {BattleHero} $hi
     * @param {*} $result
     * @param {ActionOfSkill} action 
     */
    sendResult($hi, $result, action){
        let resultInfo = new ActionResultInfo();
        resultInfo.succ = true;
        resultInfo.uo = $hi;
        resultInfo.Result = $result;
        action.Input(resultInfo);
    }

    /**
     * 事务发起方
     * @return {BattleUser}
     */
    get user(){
        if (this.hero != null && this.hero.user != null) {
             return this.hero.user;
        }
        return null;
    }
    /**
     * 事务所属战场
     * @return {BattleRoom}
     */
    get room(){
        if (this.user != null){
            return this.user.room;
        }
        else{
            return null;
        }
    }

    /**
     * 事务是否执行完毕或取消
     * @return {Boolean}
     */
    get isEnd(){
        return this.Status == StatusOfActionExecute.End;
    }

    /**
     * 基类的状态机驱动函数
     */
    Execute() {
        this.Status = StatusOfActionExecute.End;
    }

    /**
     * 反馈输入
     * @param {ActionResultInfo} param
     */
    Input(param){
        return;
    }

    /**
     * 基本检测，所有子类的Execute都必须首先调用该函数
     * @return {Boolean} 事务是否需要立即结束
     */
    SuperExecute(){
        if (this.CheckCondition()){
            this.Status = StatusOfActionExecute.End;
            return true;
        }

        if (this.user.room.LastAction != null && this.user.room.LastAction.hasResult()){//上一个事务产生了模拟输入
            let $ri = this.user.room.LastAction.getResult();
            this.Input($ri);
        }
        return false;
    }

    /**
     * 特殊条件判断 
     * @return {Boolean} True 立即结束事务
     */
    CheckCondition(){
        return this.hero.checkBuff(BattleBuffEnum.UnabledAction)
            || this.Status == StatusOfActionExecute.End
            || !this.user.Alive
            || !this.user.enemy.Alive;
    }

    /**
     * 事务执行完毕的后续处理，被子类重载
     */
    AfterExecute(){
    }
}

/**
 * 流程控制类：武将进入自身回合
 */
class ActionOfUserControl extends ActionObject
{
    /**
     * 构造函数
     * @param {BattleHero}  
     */
    constructor($hi){
        super($hi);
        this.type = ActionTypeEnum.PeriodOfUserControl;
    }

    Execute(){
        if (this.SuperExecute()) {
            return;
        }

        //添加一个全局的时间轴
        this.room.lockFrame(this.hero.CurCondition);

        switch (this.Status){
            case StatusOfActionExecute.Start:
                //Buff检测
                this.Status = this.BattleBuffCheck();
                break;

            case StatusOfActionExecute.Waiting:
                this.hero.Notify(NotifyEnum.PeriodStart);
                if(this.hero.BattleParam.Defense == this.hero.BattleParam.DefenseOfMax){//满血
                    this.hero.Notify(NotifyEnum.FullBlood);
                }
                else if(this.hero.BattleParam.Defense < this.hero.BattleParam.DefenseOfMax*0.1){//残血
                    this.hero.Notify(NotifyEnum.LowBlood);
                }
                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
    
    /**
     * 负面状态检测函数
     */
    BattleBuffCheck(){
        if (this.hero.checkBuff(BattleBuffEnum.Poisoned) || this.hero.checkBuff(BattleBuffEnum.Fire)){
            //中毒后，每回合扣减生命，但仍旧能够执行出牌阶段
            this.hero.BattleParam.Defense -= (this.hero.BattleParam.DefenseOfMax * 0.1) | 0;
            this.hero.record(OperationType.AttrChanged, {type:AttrChangedType.Poisoned, value:this.hero.Attributes});
            if(this.hero.BattleParam.Defense <= 0){
                //自动触发求生技能
                this.hero.emit(EmitType.BeDead);
                return StatusOfActionExecute.End;
            }
        }

        if (this.hero.checkBuff(BattleBuffEnum.Depression)){//沮丧，士气持续降低
            let $OldValue = this.hero.BattleParam.HonorValue;
            this.hero.BattleParam.HonorValue = Math.max(0, this.hero.BattleParam.HonorValue - 30);
            if (this.hero.BattleParam.HonorValue < $OldValue){
                this.hero.record(OperationType.AttrChanged, {type:AttrChangedType.Depression, value:this.hero.Attributes});
            }
        }

        //如果武将同时中了混乱和晕眩状态，优先处理混乱
        if (this.hero.checkBuff(BattleBuffEnum.Confused)){
            //混乱后，引发混乱攻击，然后跳过出牌阶段
            this.hero.act(SkillType.ConfuseAttack);
            return StatusOfActionExecute.End;
        }
        else if (this.hero.checkBuff(BattleBuffEnum.Dazed)){
            //晕眩后，直接跳过出牌阶段
            return StatusOfActionExecute.End;
        }
        return StatusOfActionExecute.Waiting;
    }

    /**
     * 事务结束时的扫尾工作
     */
    AfterExecute(){
        super.AfterExecute();

        //每回合减少Buff的持续回合数1，直至0
        //注：风怒在 PopAction 处检测
        for(let buff of [
            BattleBuffEnum.Bless,           //神佑
            BattleBuffEnum.PaoXiao,         //咆哮
            BattleBuffEnum.Stone,           //坚守
            BattleBuffEnum.Confused,        //混乱
            BattleBuffEnum.Poisoned,        //中毒
            BattleBuffEnum.Bang,            //暴击
            BattleBuffEnum.Sharp,           //暴击
            BattleBuffEnum.Depression,      //沮丧
            BattleBuffEnum.Fire,            //燃烧
            BattleBuffEnum.Dazed,           //晕眩
            BattleBuffEnum.JiAng,           //激昂
            BattleBuffEnum.UnabledAction,   //禁锢
            BattleBuffEnum.AntiFire,        //避火
            BattleBuffEnum.AntiWater,       //避水
            BattleBuffEnum.AntiWood,        //避风
        ]){
            if(this.hero.BattleParam.BattleBuff.LeftCount(buff) > 0){
                if(this.hero.BattleParam.BattleBuff.Decrease(buff)){
                    this.hero.record(OperationType.BuffChanged, {type:buff, count:0});
                }
            }
        }
        this.hero.localRecord = {};

        //添加一个全局的时间轴
        this.room.lockFrame(this.hero.CurCondition);

        this.user.CalcCountVersion();
    }
}

/**
 * 技能类事务对象
 */
class ActionOfSkill extends ActionObject
{
    /**
     * 构造函数
     * 用途1: 为配置表创建一个技能事务对象，以存储各项配置
     * 用途2：动态创建一个技能事务对象
     * @param {*}  $_fid        技能编号
     * @param {*}  $_notify     触发事件 NotifyEnum
     * @param {Function}  $_CanExecute 发动条件检测
     * @param {Function}  $_builder    对应的类构造函数（作为配置表条目时）
     */
    constructor($_fid, $_notify = null, $_CanExecute = null, $_builder = {}){
        super();

        this.funcId = $_fid;                  //技能类型
        this.type = ActionTypeEnum.Function;  //事务类型
        
        if (!!ConfigMgr.skill($_fid)){
            let $model = ConfigMgr.skill($_fid);

            this.Notify = new StatusManager($model.Notify.Value);     //关注的事件类型（联合枚举）
            this.CanExecute = $model.CanExecute;    //技能前置执行判定
            this.addon = $model.addon;              //技能附加参数
            this.funcType = $model.funcType;        //技能类型
            this.attackMode = $model.attackMode;    //攻击模式（选敌方式）
            
            this.enemyList = [];                    //已选定的敌人列表 List<BattleHero>
            this.skip = false;                      //打断标志
            this._hero = null;                      //执行事件的主体英雄
            this.ori = null;                        //引发事件的起源英雄
            this.HurtValuePercent = 1;              //伤害衰减百分比，例如，全体攻击衰减一般为0.4
        }
    }
    /**
     * 获取发起事务的英雄对象
     * @return {BattleHero}
     */
    get hero(){
        return this._hero;
    }
    /**
     * 设置发起事务的英雄对象
     * @param {BattleHero} val
     */
    set hero(val){
        this._hero = val;
    }

    /**
     * @return {Boolean}
     */
    SuperExecute(){
        let ret = super.SuperExecute();
        if(!ret){
            if(this.Status == StatusOfActionExecute.Start){
                this.hero.emit(EmitType.SkillReady, this.funcId);
            }
        }

        return ret;
    }

    /**
     * 事务执行完毕的后续处理
     */
    AfterExecute(){
        //调用父类方法
        super.AfterExecute();
    }

    /**
     * 技能触发的Buff所能持续的回合数，最多6回合
     */
    get Probability(){
        return 1 + Math.floor(this.level/9);
    }
    /**
     * 技能等级
     */
    get level(){
        return this.hero.GetActionLevel(this.funcId);
    }

    /**
     * 判断技能是否被限制执行 true 受到限制 false 没有受到限制
     * @param {*} list 
     */
    limit(list){
        return list.reduce((sofar, cur)=>{
            switch(cur[0]){
                case conditionEnum.globalLimit:
                    sofar |= !!this.hero.globalRecord[this.funcId] && this.hero.globalRecord[this.funcId] >= cur[1];
                    break;
                case conditionEnum.localLimit:
                    sofar |= !!this.hero.localRecord[this.funcId] && this.hero.localRecord[this.funcId] >= cur[1];
                    break;
            }
            
            return sofar;
        }, false);
    }

    /**
     * 在计算伤害前，正确设置伤害的五行属性
     * @param {*}  
     * @param {*}  
     * @param {*}  
     */
    calcDamageValue($h2, $aMode, $HurtValuePercent) {
        this.hero.curNature = this.addon.nature || this.hero.nature;    //设置五行属性
        return this.hero.calcDamageValue($h2, $aMode, $HurtValuePercent);
    }

    Execute(){
        this.Status = StatusOfActionExecute.End;
    }
}

/**
 * 濒死求援：系统帮助类
 */
class ActionOfBeDead extends ActionOfSkill
{
    Execute(){
        if(this.SuperExecute()){
            this.hero.BattleParam.Defense = 0;              //生命降为0
            return;
        }

        switch(this.Status){
            case StatusOfActionExecute.Start:
                if(this.hero.checkBuff(BattleBuffEnum.Illusion)){ //幻象，直接死亡
                    this.hero.BattleParam.Defense = 0;              //生命降为0
                    this.Status = StatusOfActionExecute.End;
                }
                else{
                    //设置濒死标志，并开始向所有队友求援，如有人援助（包括自己），应该帮助消除该标志
                    this.hero.addBuff(BattleBuffEnum.BeDead, 1);
                    for(let $simHero of this.user.getTargetHeros(this.hero, AttackMode.Our)){
                        $simHero.Notify(NotifyEnum.BeDead, this.hero);
                    }
                    this.Status = StatusOfActionExecute.Selecting;
                }
                break;

            case StatusOfActionExecute.Selecting:
                if(this.hero.checkBuff(BattleBuffEnum.BeDead)){//濒死标志依然存在，说明无人发动复活类技能
                    this.hero.BattleParam.Defense = 0;              //生命降为0
                    this.hero.Notify(NotifyEnum.Dead, this.ori);    //通告死亡事件，触发相关技能。如果这是本方最后一个英雄，将由于总生命值为0而无法再发动任何后续技能。
                    if(!!this.ori){
                        this.ori.Notify(NotifyEnum.Kill, this.hero);
                    }
                }
                this.Status = StatusOfActionExecute.End;
                break;
            
            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }

    AfterExecute(){
        super.AfterExecute();

        if(this.hero.BattleParam.Defense <= 0){
            this.hero.emit(EmitType.Dead);
        }
    }
}

/**
 * 紧箍咒 魅惑
 */
class ActionOfEnchant extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                let $simHero = this.user.getTargetHeros(this.hero, this.attackMode)[0];
                if(!!$simHero && $simHero.id != 1 /*强行规定悟空不可被魅惑*/ && $simHero.BattleParam.Defense > 0 && !$simHero.checkBuff(BattleBuffEnum.BeDead)){
                    let $bh = $simHero.CloneHero(this.user);
                    if ($bh != null){
                        //发动魅惑
                        this.hero.record(OperationType.Skill, {state:SkillStateEnum.Start, type:this.funcId, sim:[$simHero.Index]});
                        //敌对英雄离场 - 不经过濒死、死亡等中间状态
                        $simHero.lockFrame(this.hero.CurCondition).emit(EmitType.Disappear);
                        //魅惑英雄入场
                        this.user.HeroList[$bh.SiteNo] = $bh;
                        $bh.lockFrame($simHero.CurCondition).record(OperationType.Enter, {value:$bh.Attributes});
                        //结束魅惑
                        this.hero.record(OperationType.Skill, {state:SkillStateEnum.End, type:this.funcId});
                    }
                }
                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 技能对象：普通攻击
 * 相关动画流程描述：
 * 1、武将播放前冲动画，从当前位置冲刺到敌方面前
 * 2、如果该攻击被打断，武将播放被打断动画
 * 3、如果该攻击未被打断，武将播放攻击动画，接下来引发被攻击英雄的受击动画
 * 4、播放武将退回原地动画
 * 播放上述4种动画时，必须考虑相关英雄动画的合理的穿插顺序，例如只有攻击英雄前冲、攻击动作播放完毕，才能播放被攻击英雄的被击动画
 */
class ActionOfAttack extends ActionOfSkill
{
    /**
     * 反馈
     * @param {ActionResultInfo} param
     */
    Input(param){
        if (param.Result == ActionExecuteResult.SkipAttack){
            this.skip = true;
            this.Status = StatusOfActionExecute.End;
            this.hero.record(OperationType.Skill, {typ:this.funcId, state:SkillStateEnum.Cancel});
        }
    }

    /**
     * 状态机
     */
    Execute(){
        //SuperExecute函数自动记录技能准备指令
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                if (this.hero.ComboReady && !!this.hero.combo/*幻象英雄没有combo配置*/){
                    //Combo模式
                    this.attackMode = this.hero.combo[0];
                    this.HurtValuePercent = this.hero.combo[1];
                }
                else{
                    //普通模式，和职业有关
                    this.attackMode = this.hero.defaultAttackMode[0];
                    this.HurtValuePercent = this.hero.defaultAttackMode[1];
                }

                //检测是否有敌方武将发动了战争怒吼（吸引攻击）
                let $PaoXiao = this.user.getPaoXiaoHero();
                if ($PaoXiao == null){
                    this.enemyList = this.user.getTargetHeros(this.hero, this.attackMode);
                }
                else{
                    this.enemyList = [$PaoXiao];
                }
                
                if (this.enemyList.length > 0){ //已选中攻击目标
                    for(let $simHero of this.enemyList){
                        $simHero.lockFrame(this.hero.CurCondition);  //帧锁定
                        //向对方发起攻击事件通知
                        $simHero.Notify(this.enemyList.length >1 ? NotifyEnum.MultiAttack : NotifyEnum.Attack, this.hero);
                    }
                    this.Status = StatusOfActionExecute.Selecting;
                }
                else{
                    this.Status = StatusOfActionExecute.Extra;
                }

                break;

            case StatusOfActionExecute.Selecting:
                //此处需要确认敌方是否触发了“抢反”等技能，这些技能可能打断攻击进程
                if (this.skip){
                    this.Status = StatusOfActionExecute.Extra;
                }
                else{
                    this.Status = StatusOfActionExecute.Selected;
                }
                break;

            case StatusOfActionExecute.Selected:
                //通知客户端英雄发动了攻击，强制锁帧到所有目标的出生帧
                this.hero.lockFrame(this.enemyList.reduce((sofar,cur)=>{
                    sofar = Math.max(sofar, cur.BornCondition);
                    return sofar;
                },0)).record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:this.enemyList.map(it=>{return it.Index})});
                
                this.hero.BattleParam.HonorValue += 25;
                this.hero.ComboAdd();
                let $multi = this.enemyList.length > 1;
                for(let $simHero of this.enemyList){
                    //计算攻击伤害
                    let $lostLife = this.calcDamageValue($simHero, this.attackMode, this.HurtValuePercent);
                    $simHero.lockFrame(this.hero.CurCondition); //帧锁定
                    if ($lostLife.Type != AttrChangedType.Miss){//各种命中
                        $simHero.BattleParam.HonorValue += 25;
                        $simHero.record(OperationType.AttrChanged, {type:$lostLife.Type, value:$simHero.Attributes, ori:this.hero.Index});
                        if ($simHero.BattleParam.Defense > 0) {
                            if(!!this.addon.type){ //攻击附加效果
                                if (!$simHero.checkBuff(BattleBuffEnum.Bless)){
                                    $simHero.lockFrame(this.hero.CurCondition).addBuff(1<<parseInt(this.addon.type), parseInt(this.addon.val));
                                }
                            }

                            //触发造成伤害事件
                            if(!$multi){
                                $simHero.Notify(NotifyEnum.BeSingleHurted, this.hero);
                            }
                            else{
                                $simHero.Notify(NotifyEnum.BeMultiHurted, this.hero);
                            }
                            if($lostLife.Type == AttrChangedType.Parry){//发生了格挡
                                //发起反击
                                $simHero.act(SkillType.Counter);
                            }
                        }
                        else {
                            //自动触发求生技能
                            $simHero.emit(EmitType.BeDead, this.hero);
                        }
                    }
                    else{//发生了闪避
                        $simHero.record(OperationType.AttrChanged, {type:$lostLife.Type, value:$simHero.Attributes, ori:this.hero.Index});
                    }
                }
                if($multi){
                    this.hero.Notify(NotifyEnum.MultiHurt);
                }
                else{
                    this.hero.Notify(NotifyEnum.SingleHurt);
                }
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});
                this.Status = StatusOfActionExecute.End;
                break;
            
            case StatusOfActionExecute.Extra:
                this.hero.record(OperationType.Skill, {typ:this.funcId, state:SkillStateEnum.Cancel});
                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 恢复技能对象
 */
class ActionOfRecover extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                if (this.hero.ComboReady){
                    this.attackMode = AttackMode.Our;
                    this.HurtValuePercent = 1.5;
                }

                this.enemyList = this.user.getTargetHeros(this.hero, this.attackMode);
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:this.enemyList.map(it=>{return it.Index})});
                for(let $simHero of this.enemyList) {
                    if ($simHero.BattleParam.Defense > 0){
                        let $OldValue = $simHero.BattleParam.Defense;
                        $simHero.BattleParam.Defense += ($simHero.BattleParam.Ori_Defense * ConfigMgr.baseRecoverValue * this.Probability) | 0;
                        if ($simHero.BattleParam.Defense > $OldValue){
                            $simHero.lockFrame(this.hero.CurCondition).record(OperationType.AttrChanged, {ori:this.hero.Index, type:AttrChangedType.Recover, value:$simHero.Attributes});
                            $simHero.Notify(NotifyEnum.Recovered, this.hero);
                        }
                    }
                };
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});
                this.hero.Notify(NotifyEnum.Recover);

                this.Status= StatusOfActionExecute.End;
                break;

            default:
                this.Status= StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 全局光环效果
 */
class ActionOfIncreaseAura extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start});
                this.user.getTargetHeros(this.hero, this.attackMode).map($hi=>{
                    $hi.addEffectGlobal(this.addon.type, this.addon.val);
                    $hi.record(OperationType.AttrChanged, {type:AttrChangedType.Absorb, value:$hi.Attributes, ori:this.hero.Index});
                });
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});

                this.Status= StatusOfActionExecute.End;
                break;

            default:
                this.Status= StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 单体光环
 */
class ActionOfIncreaseLocal extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start});

                this.user.getTargetHeros(this.hero, this.attackMode).map($hi=>{
                    $hi.addEffectLocal(this.addon.type, this.addon.val);
                    $hi.record(OperationType.AttrChanged, {type:AttrChangedType.Absorb, value:$hi.Attributes, ori:this.hero.Index});
                });

                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});

                this.Status= StatusOfActionExecute.End;
                break;

            default:
                this.Status= StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 反击技能对象
 */
class ActionOfCounter extends ActionOfSkill
{
    Execute() {
        if (this.SuperExecute()) {
            return;
        }

        switch (this.Status) {
            case StatusOfActionExecute.Start:
                let $simHero = this.hero.HurtObject.src;

                //计算攻击伤害
                this.HurtValuePercent = 0.5;
                let $lostLife = this.calcDamageValue($simHero, AttackMode.Counter, this.HurtValuePercent);

                this.hero.record(OperationType.Skill, {state: SkillStateEnum.Start, type:this.funcId, sim:[$simHero.Index]});
                $simHero.lockFrame(this.hero.CurCondition);
                if ($lostLife.Type != AttrChangedType.Miss) {//各种命中
                    //为避免太深的嵌套，反击不再抛出受伤害事件
                    $simHero.record(OperationType.AttrChanged, {type:$lostLife.Type, value:$simHero.Attributes, ori:this.hero.Index});
                    if ($simHero.BattleParam.Defense <= 0) {
                        //自动触发求生技能
                        $simHero.emit(EmitType.BeDead, this.hero);
                    }
                }
                this.hero.record(OperationType.Skill, {type:this.funcId, state: SkillStateEnum.End});
                
                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 复活技能对象
 */
class ActionOfAlive extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                if(!!this.ori){
                    this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:[this.ori.Index]});
                    this.ori.lockFrame(this.hero.CurCondition).emit(EmitType.Alive);
                }
                
                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 励志技能对象（复活）
 */
class ActionOfLiZhi extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                this.enemyList = this.user.getTargetHeros(this.hero, AttackMode.ReBorn);
                if(this.enemyList.length>0){
                    this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:this.enemyList.map(it=>{return it.Index})});
                    for(let $simHero of this.enemyList) {
                        if($simHero.BattleParam.Defense == 0){
                            $simHero.BattleParam.Defense = $simHero.BattleParam.DefenseOfMax;
                            $simHero.BattleParam.BattleBuff.Init();

                            $simHero.lockFrame(this.hero.CurCondition).record(OperationType.Alive);
                        }
                    };
                }

                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 驱散：消除己方英雄所有不利Buff
 */
class ActionOfQuSan extends ActionOfSkill
{
    Execute() {
        if (this.SuperExecute()) {
            return;
        }

        switch (this.Status) {
            case StatusOfActionExecute.Start:
                this.enemyList = this.user.getTargetHeros(this.hero, this.attackMode);
                this.hero.record(OperationType.Skill, {state:SkillStateEnum.Start, type:this.funcId, sim:this.enemyList.map(it=>{return it.Index})})
                for(let $simHero of this.enemyList) {
                    $simHero.lockFrame(this.hero.CurCondition).emit(EmitType.QuSan);
                };
                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 献祭技能对象
 */
class ActionOfXianJi extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                let hl = this.user.getTargetHeros(this.hero, this.attackMode);
                if(hl.length>0){
                    this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:hl.map(it=>{return it.Index})});
                    for(let $simHero of hl){
                        this.hero.record(OperationType.Skill, {state:1, type:this.funcId, sim:[$simHero.Index]});
                        $simHero.BattleParam.Defense = 0;
                        $simHero.lockFrame(this.hero.CurCondition).record(OperationType.AttrChanged, {type:AttrChangedType.Absorb, value:$simHero.Attributes, ori:this.hero.Index});
                        //自动触发求生技能
                        $simHero.emit(EmitType.BeDead, this.hero);
                        
                        //攻方属性上升
                        this.hero.BattleParam.Attack += $simHero.BattleParam.Attack;
                        this.hero.BattleParam.Ori_Defense += $simHero.BattleParam.Ori_Defense;
                        this.hero.BattleParam.Defense += $simHero.BattleParam.Defense;

                        this.hero.record(OperationType.AttrChanged, {value:this.hero.Attributes, type:AttrChangedType.Absorb});
                    };
                }
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});
                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 嗜血技能对象
 */
class ActionOfBloodRecover extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                if(this.hero != null && this.hero.HurtObject != null){
                    this.hero.BattleParam.Defense += (this.hero.HurtObject.DamageValue * 0.5) | 0;
                    this.hero.record(OperationType.AttrChanged, {value:this.hero.Attributes, type:AttrChangedType.Absorb});
                }
                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 神佑 - 属性随机提升
 */
class ActionOfGodBless extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()) {
            return;
        }

        switch (this.Status) {
            case StatusOfActionExecute.Start:
                this.hero.record(OperationType.Skill, {state:SkillStateEnum.Start, type:this.funcId});
                this.BlessType = !!this.addon.type ? this.addon.type : 1 + (Math.random() * 8) | 0;
                for(let $simHero of this.user.getTargetHeros(this.hero, this.attackMode)){
                    $simHero.lockFrame(this.hero.CurCondition);
                    switch (this.BlessType) {
                        case 1:
                            $simHero.addEffectLocal(em_Effect_Comm.Valor, this.addon.val);
                            break;

                        case 2:
                            $simHero.addEffectLocal(em_Effect_Comm.Sacrifice, this.addon.val);
                            break;

                        case 3:
                            $simHero.addEffectLocal(em_Effect_Comm.Spirituality, this.addon.val);
                            break;

                        case 4:
                            $simHero.addEffectLocal(em_Effect_Comm.Honesty, this.addon.val);
                            break;

                        case 5:
                            $simHero.addEffectLocal(em_Effect_Comm.Justice, this.addon.val);
                            break;

                        case 6:
                            $simHero.addEffectLocal(em_Effect_Comm.Hamility, this.addon.val);
                            break;

                        case 7:
                            $simHero.addEffectLocal(em_Effect_Comm.Honor, this.addon.val);
                            break;

                        case 8:
                            $simHero.addEffectLocal(em_Effect_Comm.Compassion, this.addon.val);
                            break;

                        default:
                            break;
                    }
                    $simHero.record(OperationType.AttrChanged, {type:AttrChangedType.Encourage, value:$simHero.Attributes});
                };

                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 血咒技能对象
 */
class ActionOfXueZhou extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()) {
            return;
        }

        switch (this.Status) {
            case StatusOfActionExecute.Start :
                //发动血咒，扣减自身生命
                this.hero.BattleParam.Defense -= (0.9 * this.hero.BattleParam.DefenseOfMax) | 0;
                this.hero.record(OperationType.AttrChanged, {type:AttrChangedType.SelfHurt, value:this.hero.Attributes, ori: this.hero.Index});

                //自动触发求生技能
                this.hero.HurtObject.dst.BattleParam.Defense = 0;
                this.hero.HurtObject.dst.lockFrame(this.hero.CurCondition).record(OperationType.AttrChanged, {type:AttrChangedType.Absorb, value:this.hero.HurtObject.dst.Attributes, ori:this.hero.Index});
                this.hero.HurtObject.dst.emit(EmitType.BeDead, this.hero);

                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});
                
                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 增加正面状态
 */
class ActionOfAddBuff extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                let simList = this.user.getTargetHeros(this.hero, this.attackMode);
                if(simList.length>0){
                    this.hero.record(OperationType.Skill, {state:SkillStateEnum.Start, type:this.funcId, sim:simList.map(cur=>{return cur.Index})});
                    for(let hi of simList){
                        hi.addBuff(1<<parseInt(this.addon.type), parseInt(this.addon.val));
                    }
                }
                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 血爆技能对象
 */
class ActionOfBlood extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
            {
                this.enemyList = this.user.getTargetHeros(this.hero, this.attackMode);
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:this.enemyList.map(cur=>{return cur.Index})})
                for (let $simHero of this.enemyList){
                    $simHero.lockFrame(this.hero.CurCondition);

                    this.HurtValuePercent = 1;

                    //计算攻击伤害, 传入AttackMode.Blood而非this.attackMode是为了满足特殊计算的需要
                    let $lostLife = this.calcDamageValue($simHero, AttackMode.Blood, this.HurtValuePercent);

                    $simHero.record(OperationType.AttrChanged, {type:$lostLife.Type, value:$simHero.Attributes, ori:this.hero.Index});
                    if ($simHero.BattleParam.Defense > 0){
                        $simHero.Notify(NotifyEnum.BeMultiHurted);
                    }
                    else{
                        //自动触发求生技能
                        $simHero.emit(EmitType.BeDead, this.hero);
                    }
                };
                this.Status = StatusOfActionExecute.End;
                break;
            }

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 尖刺技能对象
 */
class ActionOfJianCi extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                let $simHero = this.hero.HurtObject.src;

                let $lostLife = (this.hero.HurtObject.DamageValue * 0.3) | 0;
                $simHero.BattleParam.Defense -= $lostLife;

                //攻击者播放反弹伤害动画
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:[$simHero.Index]});
                //被反弹伤害者播放属性变化动画
                $simHero.lockFrame(this.hero.CurCondition).record(OperationType.AttrChanged, {value:$simHero.Attributes, type: AttrChangedType.Reflect, ori:this.hero.Index});
                if ($simHero.BattleParam.Defense == 0){
                    //被反弹伤害者触发求生技能
                    $simHero.emit(EmitType.BeDead, this.hero);
                }

                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 团结：如果遭受了一次非致命伤害，可将伤害在队友之间进行分担
 */
class ActionOfUnity extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                this.enemyList = this.user.getTargetHeros(this.hero, AttackMode.Our);
                if(this.enemyList.length > 1){
                    this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:this.enemyList.map(it=>{return it.Index})});
                    let total = 0;
                    for (let $simHero of this.enemyList){
                        if($simHero.id != this.hero.id){
                            let lost = Math.min($simHero.BattleParam.Defense - 1, this.hero.HurtObject.DamageValue / (this.enemyList.length-1)) | 0;
                            if(lost > 0){
                                $simHero.BattleParam.Defense -= lost;
                                //分担伤害者播放属性变化动画
                                $simHero.lockFrame(this.hero.CurCondition).record(OperationType.AttrChanged, {value:$simHero.Attributes, type: AttrChangedType.Absorb});
                                total += lost;
                            }
                        }
                    }
                    //自身回血
                    this.hero.BattleParam.Defense += total;
                    this.hero.record(OperationType.AttrChanged, {value:this.hero.Attributes, type: AttrChangedType.Absorb});
                    this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});
                }

                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 幻象技能对象
 */
class ActionOfIllusion extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                let $bh = this.hero.CloneHero();
                //添加幻象标志
                $bh.BattleParam.BattleBuff.Set(BattleBuffEnum.Illusion);
        
                if ($bh != null){
                    this.user.HeroList[$bh.SiteNo] = $bh;

                    this.hero.record(OperationType.Skill, {state:SkillStateEnum.Start, type:this.funcId, sim:[$bh.Index]});

                    //通知客户端有新入场武将
                    $bh.lockFrame(this.hero.CurCondition).record(OperationType.Enter, {value:$bh.Attributes});
                }
                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 召唤术
 */
class ActionOfSummon extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                let $bh = this.user.summon(this.addon.hid);
                if(!!$bh){
                    //发动召唤技
                    this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:[$bh.Index]});

                    //通知客户端有新入场武将，锁定到召唤帧
                    let $bid = $bh.lockFrame(this.hero.CurCondition).record(OperationType.Enter, {value:$bh.Attributes});
                    //发动降临技，锁定到出生帧
                    $bh.lockBornFrame($bid).Notify(NotifyEnum.PeriodEnter, this.hero);

                    //结束召唤技
                    this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});
                }

                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 鼓舞技能对象
 */
class ActionOfEncourage extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                if (this.hero.BattleParam.HonorValue == 100){
                    this.hero.BattleParam.HonorValue = 0;
                    this.attackMode = AttackMode.Our;
                    if(this.hero.BattleParam.Changed){
                        this.hero.record(OperationType.AttrChanged, {type:AttrChangedType.EXSkill, value:this.hero.Attributes})
                    }
                }

                this.enemyList = this.user.getTargetHeros(this.hero, this.attackMode);
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:this.enemyList.map(it=>{return it.Index})});
                for(let $simHero of this.enemyList){
                    let $OldValue = $simHero.BattleParam.HonorValue;
                    $simHero.BattleParam.HonorValue = Math.min($simHero.BattleParam.HonorValue + ConfigMgr.baseEncourageValue * this.Probability, 100) | 0;
                    if ($simHero.BattleParam.HonorValue > $OldValue){
                        $simHero.record(OperationType.AttrChanged, {ori:this.hero.Index, type:AttrChangedType.Encourage, value:$simHero.Attributes});
                    }
                };

                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 偷师
 */
class ActionOfStudy extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        if(!!this.ori){
            let $fn = Object.keys(this.ori.actionList).randomElement()[0];
            if (!!ConfigMgr.skill($fn) && !this.hero.actionList[$fn]){
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:[this.ori.Index], value:$fn});
                this.hero.addSkill($fn, this.level);
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});
            }
        }

        this.Status = StatusOfActionExecute.End;
    }
}

/**
 * 顿悟：随机学习一个新的技能
 */
class ActionOfInsight extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        let recy = 0;
        while(recy++ < 50){
            let $fn = parseInt(ConfigMgr.randomSkillList().randomElement()[0]);
            if (!this.hero.actionList[$fn]){
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, value:$fn});
                this.hero.addSkill($fn, this.level);
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});
                break;
            }
        }

        this.Status = StatusOfActionExecute.End;
    }
}

/**
 * 亡语：给英雄装备一把芭蕉扇。也可以装备其他技能（用addon.baseValue配置）
 */
class ActionOfAttach extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        let $fn = this.addon.sid;
        if (!!ConfigMgr.skill($fn) && !this.user.master.actionList[$fn]){
            this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:[this.user.master.Index]});
            this.user.master.addSkill($fn, this.level);
            this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});
        }

        this.Status = StatusOfActionExecute.End;
    }
}

/**
 * 洞察技能对象
 */
class ActionOfDongCha extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        if(this.ParentAction && this.ParentAction instanceof ActionOfAttack && this.ParentAction.hero == this.ori){
            //通知跳过原攻击者的攻击过程
            this.hero.lockFrame(this.ori.CurCondition).record(OperationType.Skill, {type: this.funcId, state:SkillStateEnum.Start, sim: [this.ori.Index]}); //记录动作：洞察
            this.ori.lockFrame(this.hero.CurCondition);  //帧锁定
            this.sendResult(this.hero, ActionExecuteResult.SkipAttack, this.ParentAction);
            
            //发起反击
            this.hero.HurtObject = new BattleOperation();
            this.hero.HurtObject.src = this.ori;
            this.hero.HurtObject.Type = AttrChangedType.Parry;
            this.hero.HurtObject.attackMode = AttackMode.Head;
            this.hero.act(SkillType.Counter);
        }
     
        this.Status = StatusOfActionExecute.End;
    }
}

/**
 * 混乱攻击对象
 */
class ActionOfConfuseAttack extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                this.HurtValuePercent = 0.5;

                let $enemyList = this.user.getTargetHeros(this.hero, this.attackMode);
                for(let $simHero of $enemyList){
                    //计算攻击伤害
                    let $lostLife = this.calcDamageValue($simHero, this.attackMode, this.HurtValuePercent);

                    this.hero.record(OperationType.Skill, {state:SkillStateEnum.Start, sim:[$simHero.Index], type:this.funcId});
                    $simHero.lockFrame(this.hero.CurCondition);
                    if ($lostLife.Type != AttrChangedType.Miss) { //各种命中
                        $simHero.BattleParam.HonorValue += 25;
                        $simHero.record(OperationType.AttrChanged, {type:$lostLife.Type, value:$simHero.Attributes, ori:this.hero.Index});
                        if ($simHero.BattleParam.Defense > 0){
                            //触发造成伤害事件
                            $simHero.Notify(NotifyEnum.BeSingleHurted, this.hero);
                        }
                        else{
                            //自动触发求生技能
                            $simHero.emit(EmitType.BeDead, this.hero);
                        }
                    }
                    else{
                        $simHero.record(OperationType.AttrChanged, {type:$lostLife.Type, value:$simHero.Attributes, ori:this.hero.Index});
                    }
                    this.hero.record(OperationType.Skill, {type:this.funcId, state: SkillStateEnum.End});
                };

                this.Status = StatusOfActionExecute.End;

                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

/**
 * 增加负面状态
 * 原生混乱技能表现上很好处理，附加混乱（特别是群攻模式下）如何表现需要进一步商议
 */
class ActionOfAddDeBuff extends ActionOfSkill
{
    Execute(){
        if (this.SuperExecute()){
            return;
        }

        switch (this.Status){
            case StatusOfActionExecute.Start:
                this.enemyList = this.user.getTargetHeros(this.hero, this.attackMode);
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.Start, sim:this.enemyList.map(cur=>{return cur.Index})});
                this.enemyList.map($hi=>{
                    if (!$hi.checkBuff(BattleBuffEnum.Bless)){
                        $hi.lockFrame(this.hero.CurCondition).addBuff(1<<parseInt(this.addon.type), parseInt(this.addon.val));
                    }
                });
                this.hero.record(OperationType.Skill, {type:this.funcId, state:SkillStateEnum.End});

                this.Status = StatusOfActionExecute.End;
                break;

            default:
                this.Status = StatusOfActionExecute.End;
                break;
        }
    }
}

exports = module.exports = {
    ActionObject:ActionObject,                      //技能基类
    ActionOfUserControl:ActionOfUserControl,        //回合控制类
    ActionOfSkill:ActionOfSkill,                    //技能类

    ActionOfBeDead:ActionOfBeDead,                  //系统调用 - 求救
    ActionOfConfuseAttack:ActionOfConfuseAttack,    //系统调用 - 混乱攻击

    ActionOfIncreaseAura:ActionOfIncreaseAura,      //光环 - 全局光环
    ActionOfIncreaseLocal:ActionOfIncreaseLocal,    //加持 - 自身光环
    ActionOfAddBuff:ActionOfAddBuff,                //祝福 - 添加正面状态
    ActionOfAddDeBuff:ActionOfAddDeBuff,            //诅咒 - 添加负面状态
    ActionOfQuSan:ActionOfQuSan,                    //辟邪 - 消除负面状态
    ActionOfGodBless:ActionOfGodBless,              //强化 - 提升属性

    ActionOfEncourage:ActionOfEncourage,            //鼓舞 - 回复士气
    ActionOfRecover:ActionOfRecover,                //回复 - 回复生命
    ActionOfAlive:ActionOfAlive,                    //急救 - 救援濒死队友
    ActionOfLiZhi:ActionOfLiZhi,                    //轮回 - 复活阵亡队友

    ActionOfDongCha:ActionOfDongCha,                //洞察 - 打断攻击并发动反击

    ActionOfIllusion:ActionOfIllusion,              //分身 - 创造自身的分身上场
    ActionOfEnchant:ActionOfEnchant,                //魅惑 - 诱使敌方英雄叛逃
    ActionOfSummon:ActionOfSummon,                  //召唤 - 召唤新的英雄出场

    ActionOfAttack:ActionOfAttack,                  //攻击
    ActionOfCounter:ActionOfCounter,                //反击 - 反击攻击者，格挡时会自动触发
    ActionOfXianJi:ActionOfXianJi,                  //献祭 - 吞噬一名友军，提升自身属性
    ActionOfBloodRecover:ActionOfBloodRecover,      //嗜血 - 命中时回复自身生命
    ActionOfXueZhou:ActionOfXueZhou,                //血咒 - 命中时秒杀敌军
    ActionOfBlood:ActionOfBlood,                    //自爆 - 死亡时爆炸造成全体敌军伤害
    ActionOfJianCi:ActionOfJianCi,                  //反射 - 受伤时反弹伤害
    ActionOfUnity:ActionOfUnity,                    //团结 - 召唤全体队友分担伤害

    ActionOfAttach:ActionOfAttach,                  //神工 - 为主角附加技能
    ActionOfStudy:ActionOfStudy,                    //偷师 - 受伤时偷学攻击者技能
    ActionOfInsight:ActionOfInsight,                //顿悟 - 学会一项随机技能

    ConfigMgr:ConfigMgr,                            //配置管理对象
}