let facade = require('../../Facade')
let {em_Effect_Name, em_Effect_Comm, em_EffectCalcType, mapOfTechCalcType} = facade.const
let {SkillStateEnum,conditionEnum, ProfessionType,SkillNameEnum,EmitType,OperationType,StatusOfActionExecute,PeriodTypeEnum,NotifyEnum,AttrChangedType,BattleBuffEnum,AttackMode,EnhanceMode,ActionTypeEnum,ActionExecuteResult} = require('./enum')
let StatusManager = require('./StatusManager')

const PetList = facade.config.fileMap.HeroList.reduce((sofar, cur) => {
    cur.loc = cur.locStr.split(',');
    cur.boot = parseInt(cur.boot);
    cur.profession = parseInt(cur.profession);
    cur.ActionList = [];
    cur.ActionList.push(cur.action1.split(';').reduce((sofar,cur)=>{sofar.push(cur);return sofar;},[]));
    cur.ActionList.push(cur.action2.split(';').reduce((sofar,cur)=>{sofar.push(cur);return sofar;},[]));
    cur.ActionList.push(cur.action3.split(';').reduce((sofar,cur)=>{sofar.push(cur);return sofar;},[]));
    cur.ActionList.push(cur.action4.split(';').reduce((sofar,cur)=>{sofar.push(cur);return sofar;},[]));
    cur.ActionList.push(cur.action5.split(';').reduce((sofar,cur)=>{sofar.push(cur);return sofar;},[]));

    sofar[cur.id] = cur; 
    return sofar;
}, {});


/**
 * 实战参数
 */
class BattleParam
{
    /**
     * 构造函数
     * @param {BattleHero} $hi
     */
    constructor($hi){
        this.hero = $hi;
        this.BattleBuff = new StatusManager(); 
        this._HonorValue = 50;
        this._Defense = -1;
        this._Power = -1;
        this.$changed = false;
        this.current = new BaseBattleParam();
    }

    /**
     * 卡牌有效战斗力
     */
    get Power(){
        if(this._Power == -1){
            //this._Power = this.current.Value;
            this._Power = this.AttackOfEffect * this.DefenseOfEffect;
        }
        return this._Power;
    }

    set HonorValue($value){
        let nv = Math.min(100, Math.max(0, $value));
        if(this._HonorValue != nv){
            this._HonorValue = nv;
            this.$changed = true;
        }
    }
    /**
     * 气势，最大100
     */
    get HonorValue(){
        return this._HonorValue;
    }

    get Changed(){
        if(this.$changed){
            this.$changed = false;
            return true;
        }
        return this.$changed;
    }

    /**
     * 攻击 通过增加Ori_Attack和Valor的值，可以立即改变Attack
     */
    get Attack(){
        let $Valor = this.hero.Effect.CalcFinallyValue(em_Effect_Comm.Valor, this.current.Valor);
        return (this.Ori_Attack * (1 + $Valor / ($Valor + BattleParam.ParamValue * this.hero.level))) | 0;
    }
    set Attack($value){
        if(this.Ori_Attack != $value){
            this.Ori_Attack = $value;
            this.$changed = true;
        }
    }

    /**
     * 相对攻击 = 攻击 ×（1 + 攻击加成率）×（命中率 + 精准率 + 2×暴击率）
     */
    get AttackOfEffect(){
        return this.Attack * (this.Catch + this.Wreck + 2*this.Bang) / 100 | 0;
    }

    /**
     * 相对生命 = 生命 ×（1 + 生命加成率）/  Max（0.1，（1 - 闪避率 – 0.5×坚韧率 – 0.5×格挡率）
     */
    get DefenseOfEffect(){
        return this.DefenseOfMax * Math.max(10, 100 - this.Miss - 0.5*this.Tough - 0.5*this.Parry) / 100 | 0;
    }

    /**
     * 防御(生命)
     */
    get Defense(){
        if (this._Defense == -1){
            this._Defense = this.DefenseOfMax;
        }
        return this._Defense;
    }
    set Defense($value){
        let nv = Math.max(Math.min($value, this.DefenseOfMax), 0) | 0;
        if(this._Defense != nv){
            this._Defense = nv;
            this.$changed = true;
        }
    }

    /**
     * 最大生命值
     */
    get DefenseOfMax(){
        let $Sacrifice = this.hero.Effect.CalcFinallyValue(em_Effect_Comm.Sacrifice, this.current.Sacrifice);
        return (this.Ori_Defense * (1 + this.current.Sacrifice / (this.current.Sacrifice + BattleParam.ParamValue * this.hero.level))) | 0;
    }

    /**
     * 命中率×100
     */
    get Catch(){
        let $Justice = this.hero.Effect.CalcFinallyValue(em_Effect_Comm.Justice, this.current.Justice);
        return ((0.35 + 0.5 * $Justice / ($Justice + BattleParam.ParamValue * this.hero.level))*100) | 0;
    }
    /**
     * 闪避率×100
     */
    get Miss(){
        let $Hamility = this.hero.Effect.CalcFinallyValue(em_Effect_Comm.Hamility, this.current.Hamility);
        return (100 * (0.5 * $Hamility / ($Hamility + BattleParam.ParamValue* this.hero.level))) | 0;
    }

    /**
     * 破击率×100
     */
    get Wreck(){
        let $Honor = this.hero.Effect.CalcFinallyValue(em_Effect_Comm.Honor, this.current.Honor);
        return (100 * (0.5 * $Honor / ($Honor + BattleParam.ParamValue* this.hero.level))) | 0;
    }

    /**
     * 格挡率×100
     */
    get Parry(){
        let $Compassion = this.hero.Effect.CalcFinallyValue(em_Effect_Comm.Compassion, this.current.Compassion);
        return (100*(0.1 + 0.5 * $Compassion / ($Compassion + BattleParam.ParamValue* this.hero.level))) | 0;
    }

    /**
     * 暴击率×100
     */
    get Bang(){
        let $Spirituality = this.hero.Effect.CalcFinallyValue(em_Effect_Comm.Spirituality, this.current.Spirituality);
        return (100 * (0.25 + 0.5 * $Spirituality / ($Spirituality + BattleParam.ParamValue* this.hero.level))) | 0;
    }

    /**
     * 韧性×100
     */
    get Tough(){
        let $Honesty = this.hero.Effect.CalcFinallyValue(em_Effect_Comm.Honesty, this.current.Honesty);
        return (100 *(0.5 * $Honesty / ($Honesty + BattleParam.ParamValue* this.hero.level))) | 0;
    }
}
/**
 * 二级属性辅助计算参数
 */
BattleParam.ParamValue = 16;
/**
 * 暴击强度×100
 */
BattleParam.Intensity = 200;

/**
 * 战斗操作
 */
class BattleOperation
{
    constructor(){
        this.src = null; //BattleHero
        this.dst = null; //BattleHero
        /// <summary>
        /// 伤害值
        /// </summary>
        this.DamageValue = 0;
        /// <summary>
        /// 攻击模式
        /// </summary>
        this.attackMode = AttackMode.All;
        /// <summary>
        /// 伤害类型
        /// </summary>
        this.Type = AttrChangedType.Damage;
    }
}

/**
 * 英雄荣誉系统参数
 */
class BaseBattleParam
{
    /**
     * 读取数组形式的参数
     * @return {BaseBattleParam}
     */
    read($Valor=100, $Sacrifice=100, $Spirituality=100, $Honesty=100, $Justice=100, $Hamility=100, $Honor=100, $Compassion=100){
        /// <summary>
        /// 英勇 力量
        /// </summary>
        this.Valor = $Valor;
        /// <summary>
        /// 牺牲 护甲
        /// </summary>
        this.Sacrifice = $Sacrifice;
        /// <summary>
        /// 精神 暴击
        /// </summary>
        this.Spirituality = $Spirituality;
        /// <summary>
        /// 诚实 韧性
        /// </summary>
        this.Honesty = $Honesty;
        /// <summary>
        /// 公正 命中
        /// </summary>
        this.Justice = $Justice;
        /// <summary>
        /// 谦卑 闪避
        /// </summary>
        this.Hamility = $Hamility;
        /// <summary>
        /// 荣誉 精准
        /// </summary>
        this.Honor = $Honor;
        /// <summary>
        /// 怜悯 格挡
        /// </summary>
        this.Compassion = $Compassion;

        return this;
    }

    get Value(){
        return this.Valor + this.Sacrifice + this.Spirituality + this.Honesty + this.Justice + this.Hamility + this.Honor + this.Compassion;
    }

    /**
     * 复制传入英雄对象的属性
     * @param {BaseBattleParam}  $ho
     */
    clone($ho){
        this.Compassion = $ho.Compassion;
        this.Hamility = $ho.Hamility;
        this.Honesty = $ho.Honesty;
        this.Honor = $ho.Honor;
        this.Justice = $ho.Justice;
        this.Sacrifice = $ho.Sacrifice;
        this.Spirituality = $ho.Spirituality;
        this.Valor = $ho.Valor;

        return this;
    }
    /**
     * 倍增属性值后返回对象
     * @return {BaseBattleParam}
     */
    multi(mul){
        this.Compassion = this.Compassion * mul | 0;
        this.Hamility = this.Hamility * mul | 0;
        this.Honesty = this.Honesty * mul | 0;
        this.Honor = this.Honor * mul | 0;
        this.Justice = this.Justice * mul | 0;
        this.Sacrifice = this.Sacrifice * mul | 0;
        this.Spirituality = this.Spirituality * mul | 0;
        this.Valor = this.Valor * mul | 0;

        return this;
    }
}
/**
 * 代表单一输出指令的对象
 */
class OperationItem
{
    constructor($type = OperationType.None, $params = {}){
        this.type = $type;
        this.params = $params;

        this.EventIndex = 0;    //事件句柄
        this.PreCondition = 0;  //前置事件句柄
    }

    /**
     * 翻译为可读格式
     */
    translate(){
        switch(this.type){
            case OperationType.Start:
                if(this.params.a >= this.params.b){
                    this.params.desc = `战斗开始了！攻方获得了先手 ${this.params.a}/${this.params.b}`;
                }
                else{
                    this.params.desc = `战斗开始了！守方获得了先手 ${this.params.a}/${this.params.b}`;
                }
                break;
            
            case OperationType.Enter:
                this.params.desc = `${this.src}进场了！基本属性：${this.getAttr(this.params.value)}`;
                break;

            case OperationType.End:
                this.params.desc = `战斗结束，${this.params.victory?'我方获胜了':'我方失败了'}！`;
                break;

            case OperationType.Skill:
                switch(this.params.state){
                    case SkillStateEnum.Ready:
                        this.params.desc = `${this.src}准备施放法术[${SkillNameEnum[this.params.type]}]`;
                        break;
                    case SkillStateEnum.Start:
                        let simStr = "";
                        if(!!this.params.sim){
                            simStr = `目标：${this.params.sim.reduce((sofar, cur)=>{sofar += `-${this.getName(cur)}-`; return sofar}, '')}`;
                        }
                        if(!!this.params.value){
                            simStr += `学习了[${SkillNameEnum[this.params.value]}]`;
                        }
                        this.params.desc = `${this.src}开始施放法术[${SkillNameEnum[this.params.type]}], ${simStr}`;
                        break;
                    case SkillStateEnum.Cancel:
                        this.params.desc = `${this.src}的施法被打断了`;
                        break;
                    case SkillStateEnum.End:
                        this.params.desc = `${this.src}结束了本次施法`;
                    break;
                }
                break;

            case OperationType.AttrChanged:
                if(!!this.params.ori){
                    this.params.desc = `${this.src} 受 ${this.getName(this.params.ori)} 的 ${AttrChangedType.TypeStr(this.params.type)} 影响，属性变化为：${this.getAttr(this.params.value)}`;
                }
                else{
                    this.params.desc = `${this.src} 受 ${AttrChangedType.TypeStr(this.params.type)} 影响，属性变化为：${this.getAttr(this.params.value)}`;
                }
                break;

            case OperationType.Dead:
                this.params.desc = `${this.src}阵亡了`;
                break;

            case OperationType.Alive:
                this.params.desc = `${this.src}复活了`;
                break;

            case OperationType.Notify:
                this.params.desc = `${this.src}收到消息：${NotifyEnum.StatusName(this.params.type)}`;
                break;

            case OperationType.BuffChanged:
                if(this.params.count > 0){
                    this.params.desc = `${this.src}战斗状态新增: ${BattleBuffEnum.StatusName(this.params.type)} 持续 ${this.params.count} 回合`;
                }
                else if(this.params.count == -1){
                    this.params.desc = `${this.src}战斗状态新增: ${BattleBuffEnum.StatusName(this.params.type)} 永久有效`;
                }
                else{
                    this.params.desc = `${this.src}战斗状态失效: ${BattleBuffEnum.StatusName(this.params.type)}`;
                }
                break;

            case OperationType.Combo:
                this.params.desc = `${this.src}提升连击数到${this.params.value}！`;
                break;

            case OperationType.ComboReady:
                this.params.desc = `${this.src}发动了连击技能！`;
                break;
            
            case OperationType.Disappear:
                this.params.desc = `${this.src}离场了！`;
                break;

            case OperationType.Effect:
                if(this.params.global){
                    this.params.desc = `${this.src}新增全局效果: ${em_Effect_Name[this.params.type]}/${this.params.value}`;
                }
                else{
                    this.params.desc = `${this.src}新增效果: ${em_Effect_Name[this.params.type]}/${this.params.value}`;
                }
                break;
        }
        return this;
    }

    get src(){
        return this.getName(this.params.sInfo);
    }
    /**
     * 解析
     * @param {*} params 
     */
    getName(params){
        return `${params[0]}的英雄${PetList[params[1]].name}(位于${params[2]})`;
    }
    /**
     * 英雄基本属性
     * @param {*} params 
     */
    getAttr(params){
        return `攻击${params.a}, 生命${params.d}/${params.dm} 士气${params.h}`;
    }
}

/**
 * 事务间信息传递对象
 */
class ActionResultInfo
{
    constructor(){
        /// <summary>
        /// 事务是否成功执行
        /// </summary>
        this.succ = false;
        /// <summary>
        /// 执行对象
        /// </summary>
        this.uo = null;
        /// <summary>
        /// 被执行对象
        /// </summary>
        this.simUo = null;
        /// <summary>
        /// 执行结果
        /// </summary>
        this.Result = ActionExecuteResult.None;
    }
}

exports = module.exports = {
    BattleParam:BattleParam,
    BattleOperation:BattleOperation,
    BaseBattleParam:BaseBattleParam,
    ActionResultInfo:ActionResultInfo,
    OperationItem:OperationItem,
}