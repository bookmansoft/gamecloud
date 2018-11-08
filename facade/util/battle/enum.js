/**
 * 职业
 */
const ProfessionType = {
    Soldier: 1,     //战士
    Wizard: 2,      //术士
    Archer: 3,      //弓箭手
};

/**
 * 技能类型名称
 */
const SkillNameEnum = {
    1: '暴躁',
    2: '普通攻击',
    3: '蟠桃',
    4: '鼓舞',
    6: '混乱',
    7: '混乱攻击',
    8: '附加中毒',
    9: '附加晕眩',
    10:'附加沮丧',
    11:'禁止',
    12:'咆哮',
    13:'尖刺',
    14:'神佑',
    15:'血爆',
    16:'救命毫毛',
    17:'战吼：圣盾',
    18:'幻象',
    19:'血咒',
    20:'嗜血',
    21:'祈福',
    30:'勇武',
    31:'不屈',
    32:'激昂',
    34:'献祭',
    35:'驱散',
    36:'筋斗云',
    37:'励志',
    38:'火眼金睛',
    39:'芭蕉扇', 
    40:'定海神针',
    41:'避风珠',
    42:'求生',
    43:'蓄力',
    44:'全体蓄力',
    45:'三昧真火',
    46:'火攻免疫',
    47:'东海龙王',
    48:'水攻免疫',
    49:'团结',
    50:'降低费用',
    51:'降低全局费用',
    52:'魅惑',
    53:'亡语：装备芭蕉扇',
    54:'偷师',
    55:'顿悟',
    56:'涅槃',
    57:'回春：圣盾',
    58:'三头六臂',
    59:'火尖枪',
    60:'画地为牢',
    61:'影分身',
    62:'救命毫毛',
    63:'蟠桃宴',
    64:'尸变',
    65:'全体沮丧',
    66:'全体恢复',
    67:'当头棒喝',
    68:'破甲',
    69:'奋起',
    70:'回春',
    71:'不屈',
    72:'混天绫',
    73:'乾坤圈',
    74:'风火轮',
    75:'紫金铃',
    76:'阴阳二气瓶',
    77:'金铙',
    78:'金刚琢',
    79:'紫金红葫芦',
    80:'幌金绳',
    81:'人种袋',
    82:'杨柳净瓶',
    83:'宝莲灯',
    84:'锦镧袈裟',
    85:'九环锡杖',
    86:'般若波罗蜜',
    101:'召唤悟空',
    102:'召唤桃子',
    103:'召唤蟹将',
    104:'召唤童女',
    105:'召唤黑熊精',
    106:'召唤白骨精',
    107:'召唤奔波儿灞',
    108:'召唤哪吒',
    109:'召唤紫金钵',
    110:'召唤东土圣僧',
    204:'亡语：召唤铁扇公主',
}

let EmitTypeInc = 0;
/**
 * 即时事件类型
 */
const EmitType = {
    CountChange: EmitTypeInc++,     //回合切换
    Dead: EmitTypeInc++,            //英雄阵亡
    Disappear: EmitTypeInc++,       //英雄离场
    SkillReady: EmitTypeInc++,      //英雄准备发动技能
    BeDead: EmitTypeInc++,          //英雄濒死
    Alive: EmitTypeInc++,           //英雄复活
    QuSan: EmitTypeInc++,           //驱散负面状态
    Action: EmitTypeInc++,          //生成新的事务
}

let OperationTypeInc = 0, OperationTypeEnd = 1000;
/**
 * 输出指令类型
 */
const OperationType = {
    /**
     * 战斗开始
     */
    Start: OperationTypeInc++,
    /**
     * 角色入场
     */
    Enter: OperationTypeInc++,
    /**
     * 死亡
     */
    Dead: OperationTypeInc++,
    /**
     * 复活
     */
    Alive: OperationTypeInc++,
    /**
     * 发动技能, 状态统一为：0准备、1攻击、2中断、3复原
     */
    Skill: OperationTypeInc++,
    /**
     * Buff发生变化
     */
    BuffChanged: OperationTypeInc++,
    /**
     * 攻击、生命、士气发生变化时发送
     */
    AttrChanged: OperationTypeInc++,
    /**
     * 收到事件
     */
    Notify: OperationTypeInc++,
    /**
     * 连击数增加
     */
    Combo: OperationTypeInc++,
    /**
     * 连击成熟
     */
    ComboReady: OperationTypeInc++,
    /**
     * 新增效果
     */
    Effect: OperationTypeInc++,
    /**
     * 阵亡英雄退场
     */
    Disappear: OperationTypeInc++,
    /**
     * 战斗结束
     */
    End: OperationTypeEnd,
}
/**
 * 事务执行流程
 */
const StatusOfActionExecute = {
    /**
     * 开始阶段
     */
    Start: 1,
    /**
     * 等待选择目标
     */
    Selecting: 2,
    /**
     * 选定目标阶段
     */
    Selected: 3,
    /**
     * 已经选定目标；等待发起无懈可击阶段（技能类事务一般跳过此阶段；因为技能不能被无懈）
     */
    Require: 4,
    /**
     * 已经选定目标；无懈可击失效；等待对方反应阶段
     */
    Waiting: 5,
    /**
     * 附加的特殊流程
     */
    Extra: 6,
    /**
     * 结束阶段
     */
    End: 7,
}

const PeriodTypeEnum = {
    /**
     * 回合外
     */
    None: 1,
    /**
     * 回合内
     */
    PeriodOfUserControl: 2,
}

const NotifyEnum = {
    /**
     * 空值
     */
    None: 0,
    /**
     * 濒死
     */
    BeDead: 1 << 0,
    /**
     * 因单体攻击受到伤害
     */
    BeSingleHurted: 1 << 1,
    /**
     * 因群体攻击受到伤害
     */
    BeMultiHurted: 1 << 2,
    /**
     * 角色死亡
     */
    Dead: 1 << 3,
    /**
     * 发动单体普攻
     */
    Attack: 1 << 4,
    /**
     * 开始阶段，英雄获取控制权
     */
    PeriodStart: 1 << 5,
    /**
     * 单体攻击造成伤害
     */
    SingleHurt: 1 << 6,
    /**
     * 群体攻击造成伤害
     */
    MultiHurt: 1 << 7,
    /**
     * 英雄入场，作为英雄技能触发的特殊时期，此类技能CD一般设为0
     */
    PeriodEnter: 1 << 9,
    /**
     * 消灭一个敌人
     */
    Kill: 1 << 12,
    /**
     * 发动群体普攻
     */
    MultiAttack: 1 << 13,
    /**
     * 恢复生命
     */
    Recover: 1 << 15,
    /**
     * 被恢复生命
     */
    Recovered: 1 << 16,
    /**
     * 濒死-只通知自己
     */
    BeDeadSelf: 1 << 17,
    /**
     * 重整时满血
     */
    FullBlood: 1 << 18,
    /**
     * 重整时残血
     */
    LowBlood: 1 << 19,

    /**
     * 通知类型的名称
     */
    StatusName: function($ai){
        switch ($ai){
            case NotifyEnum.BeDead:
                return "濒死";
            case NotifyEnum.BeSingleHurted:
                return "受到单体伤害";
            case NotifyEnum.BeMultiHurted:
                return "受到群体伤害";
            case NotifyEnum.Dead:
                return "死亡";
            case NotifyEnum.Attack:
                return "发动单体普攻";
            case NotifyEnum.MultiAttack:
                return "发动群体普攻";
            case NotifyEnum.PeriodStart:
                return "获得行动权";
            case NotifyEnum.SingleHurt:
                return "造成单体伤害";
            case NotifyEnum.MultiHurt:
                return "造成群体伤害";
            default:
                return "";
        }
    }
}

let $AttrChangedType = 0;
/**
 * 引发属性变化的原因
 */
let AttrChangedType = {
    /**
     * 闪避
     */
    Miss: $AttrChangedType++,
    /**
     * 格挡
     */
    Parry: $AttrChangedType++,
    /**
     * 暴击
     */
    Bang: $AttrChangedType++,
    /**
     * 普通攻击
     */
    Damage: $AttrChangedType++,
    /**
     * 反弹伤害
     */
    Reflect: $AttrChangedType++,
    /**
     * 鼓舞
     */
    Encourage: $AttrChangedType++,
    /**
     * 恢复
     */
    Recover: $AttrChangedType++,
    /**
     * 沮丧
     */
    Depression: $AttrChangedType++,
    /**
     * 吸收
     */
    Absorb: $AttrChangedType++,
    /**
     * 施放EX技能
     */
    EXSkill:$AttrChangedType++,
    /**
     * 自残
     */
    SelfHurt: $AttrChangedType++,
    /**
     * 中毒
     */
    Poisoned:  $AttrChangedType++,
    /**
     * 免疫火系伤害
     */
    AntiFire:  $AttrChangedType++,
    /**
     * 免疫水系伤害
     */
    AntiWater:  $AttrChangedType++,
    /**
     * 免疫木（风）系伤害
     */
    AntiWood:  $AttrChangedType++,
    /**
     * 枚举值总数
     */
    Length: $AttrChangedType++,

    /**
     * 名称翻译
     */
    TypeStr: function($bt) {
        switch ($bt){
            case AttrChangedType.Miss:
                return "闪避";
            case AttrChangedType.Parry:
                return "格挡";
            case AttrChangedType.Bang:
                return "暴击";
            case AttrChangedType.Damage:
                return "普通攻击";
            case AttrChangedType.Reflect:
                return "反弹伤害";
            case AttrChangedType.Encourage:
                return "鼓舞";
            case AttrChangedType.Depression:
                return "沮丧";
            case AttrChangedType.Absorb:
                return "吸收";
            case AttrChangedType.Recover:
                return "恢复";
            case AttrChangedType.SelfHurt:
                return "自残";
            case AttrChangedType.Poisoned:
                return "中毒";
            case AttrChangedType.AntiFire:
                return "避火";
            case AttrChangedType.AntiWater:
                return "避水";
            case AttrChangedType.AntiWood:
                return "避风";
            default:
                return "";
        }
    }
}

/**
 * 战斗状态
 */
const BattleBuffEnum = {
    None: 1 << 0,
    /**
     * 陷入混乱状态
     */
    Confused: 1 << 2,
    /**
     * 陷入晕眩状态
     */
    Dazed: 1 << 3,
    /**
     * 陷入中毒状态
     */
    Poisoned: 1 << 4,
    /**
     * 禁止使用技能
     */
    UnabledAction: 1 << 5,
    /**
     * 咆哮
     */
    PaoXiao: 1 << 6,
    /**
     * 神佑 免除负面影响
     */
    Bless: 1 << 7,
    /**
     * 石头皮肤 此状态下，单次被击受伤不超过50点
     */
    Stone: 1 << 8,
    /**
     * 激昂，3倍伤害
     */
    JiAng: 1 << 9,
    /**
     * 濒死
     */
    BeDead: 1 << 10,
    /**
     * 免疫火系伤害
     */
    AntiFire: 1 << 11,
    /**
     * 幻象标志
     */
    Illusion: 1 << 12,
    /**
     * 死亡标志：阵亡但尚未离场时的状态
     */
    Dead: 1 << 13,
    /**
     * 持续燃烧
     */
    Fire: 1 << 14,
    /**
     * 风怒
     */
    WindFury: 1 << 15,
    /**
     * 破甲，无视防御技能
     */
    Sharp: 1<<16,
    /**
     * 必然暴击
     */
    Bang: 1<<17,
    /**
     * 沮丧，士气持续下降
     */
    Depression: 1<< 18,
    /**
     * 免疫水系伤害
     */
    AntiWater: 1 << 19,
    /**
     * 免疫木（风）系伤害
     */
    AntiWood: 1 << 20,

    /**
     * 名称
     * @param {Number} $ai BattleBuffEnum
     */
    StatusName: function($ai) {
        switch ($ai){
            case BattleBuffEnum.Confused:
                return "混乱";
            case BattleBuffEnum.Dazed:
                return "晕眩";
            case BattleBuffEnum.Poisoned:
                return "中毒";
            case BattleBuffEnum.UnabledAction:
                return "禁止";
            case BattleBuffEnum.WindFury:
                return "风怒";
            case BattleBuffEnum.Sharp:
                return "破甲";
            case BattleBuffEnum.PaoXiao:
                return "咆哮";
            case BattleBuffEnum.Bless:
                return "神佑";
            case BattleBuffEnum.Stone:
                return "圣盾";
            case BattleBuffEnum.JiAng:
                return "激昂";
            case BattleBuffEnum.BeDead:
                return "濒死";
            case BattleBuffEnum.Dead:
                return "死亡";
            case BattleBuffEnum.Fire:
                return "燃烧";
            case BattleBuffEnum.AntiFire:
                return "避火";
            case BattleBuffEnum.AntiWater:
                return "避水";
            case BattleBuffEnum.AntiWood:
                return "避风";
        }
        return "";
    }
}

/**
 * 攻击模式
 */
const AttackMode = {
    /**
     * 单体攻击，攻击第一个
     */
    Head: 1,
    /**
     * 单体攻击，攻击最后一个
     */
    Back: 2,
    /**
     * 纵向群体攻击
     */
    Column: 3,
    /**
     * 横向群体攻击
     */
    Row: 4,
    /**
     * 全体攻击
     */
    All: 5,
    /**
     * 己方相对施法者的下一个行动英雄
     */
    Single: 6,
    /**
     * 针对己方全部英雄（增益）
     */
    Our: 7,
    /**
     * 反击，针对对自己造成伤害的英雄进行反击
     */
    Counter: 8,
    /**
     * 混乱，选择下一个行动的己方英雄进行攻击
     */
    Confusion: 9,
    /**
     * 血爆
     */
    Blood: 10,
    /**
     * 重生
     */
    ReBorn: 11,
    /**
     * 当前英雄自己
     */
    Me:12,
    /**
     * 随机敌军1名
     */
    RandomEnemy:13,
    /**
     * 随机友军1名
     */
    RandomOur:14,
    /**
     * 随机敌军3名
     */
    RandomEnemy3:15,
    /**
     * 随机友军3名
     */
    RandomOur3:16,
    /**
     * 命中的敌方英雄
     */
    Hurt:17,
}

/**
 * 属性变化起因描述
 */
const EnhanceMode = {
    Attacked:0,
    Recover:1,
}

/**
 * 事务类型
 */
const  ActionTypeEnum = {
    /**
     * 无意义
     */
    None: 0,
    /**
     * 回合开始阶段
     */
    PeriodOfUserControl: 1,
    /**
     * 法术类
     */
    Function: 2,
}

/**
 * 操作执行结果
 */
const ActionExecuteResult = {
    None: 0,
    /**
     * 跳过正常攻击过程
     */
    SkipAttack: 1<<0,
}

/**
 * 施法通用流程，在Ready阶段可被有条件打断，如打断进入Cancel，未打断进入Start再进入End
 */
const SkillStateEnum = {
    Ready: 0,       //准备
    Start: 1,       //开始
    Cancel: 2,      //打断
    End:3,          //复原
}

/**
 * 技能执行限制条件
 */
const conditionEnum = {
    globalLimit: 0,     //全局执行次数限制
    localLimit: 1,      //单回合执行次数限制
}

exports = module.exports = {
    ProfessionType:ProfessionType,
    SkillNameEnum:SkillNameEnum,
    EmitType:EmitType,
    OperationType:OperationType,
    StatusOfActionExecute:StatusOfActionExecute,
    PeriodTypeEnum:PeriodTypeEnum,
    NotifyEnum:NotifyEnum,
    AttrChangedType:AttrChangedType,
    BattleBuffEnum:BattleBuffEnum,
    AttackMode:AttackMode,
    EnhanceMode:EnhanceMode,
    ActionTypeEnum:ActionTypeEnum,
    ActionExecuteResult:ActionExecuteResult,
    SkillStateEnum:SkillStateEnum,
    conditionEnum:conditionEnum,
}