/**
 * 罗列自定义枚举和数据结构
 */

/**
 *  枚举定义文件，使用范例：
 *  let {ReturnCode} = require('./comm');
 *  console.log(ReturnCode.Error);
 */

/**
 * 资源类型 type, 约定 200 以内的为独立索引，以上的为复合索引(使用时必须和分类 id 联合使用，其最终索引值为 type+id)
 */
const ResType = {
    /**
     * 元宝   'D'
     */
    Diamond: 1,
    "D" : 1,
    /**
     * 金币   'M'
     */
    Coin: 2,
    "M" : 2,
    /**
     * 大数型金币 'L'
     */
    Gold: 3,
    "L" : 3,
    /**
     * 用于升级PVP英雄的万能碎片
     */
    chip : 7,
    /**
     * 用于进阶PVP英雄的万能碎片
     */
    advancedChip : 8,
    /**
     * 体力值  'A'
     */
    Action : 9,
    "A": 9,
    /**
     * 'V' VIP特权（单位：天）
     */
    VIP: 20,
    "V": 20,
    /**
     * "I" 道具
     */
    Item: 40000,
    "I": 40000,
    /**
     * "box" 礼包
     */
    Box: 50000,
    "box": 50000,
}
/**
 * 资源类型降序数组
 */
const ResTypeGroup = Object.keys(ResType).sort((a,b) => ResType[b] - ResType[a]);
/**
 * 从复合索引推导出资源类型(200以内为独立索引)
 * @param {*} val 
 */
function GetResType(val) {
    if(val < 200) {
        return val;
    }

    for(let tp of ResTypeGroup) {
        if(val > ResType[tp]) {
            return ResType[tp];
        };
    }
}

/**
 * 受限行为类型
 */
const ActionExecuteType = {
    AE_Login: 1,              //每日可累计登录次数
    AE_SocialOfFail: 2,       //每日可以进行失败分享的次数
    AE_SocialOfAction: 3,     //每日可以赠送体力分享的次数
    AE_SocialOfSuper: 4,      //每日可以进行胜利超越分享的次数
    AE_SlaveCatch:5,          //每日可以进行抓捕奴隶的次数
    AE_SlaveEscape:6,         //每日可以进行起义的次数
    slaveFood: 7,             //奴隶：给奴隶加餐
    slaveAvenge: 8,           //奴隶：报复
    slaveFlattery: 9,         //奴隶：谄媚
    slaveCommend: 10,         //奴隶：表扬
    slaveLash: 12,            //奴隶：鞭挞 - 随机奖励
    vipDaily: 21,             //VIP：领取每日奖励
    AE_Revival:22,            //赠送重生次数
    AE_Chip:101,              //免费抽取三界符
    AE_Totem_Assign:102,      //免费重新分配圣光
};

const MAX_INT = Math.pow(2, 53) -1;

/**
 * 索引/反向索引的类型
 */
const IndexType = {
    Primary: 0,         //主键
    Foreign:1,          //外键
    Domain:2,           //复合键，可能由多个字段组合而成
    Name:3,             //Name-ID键值对
    Token:4,            //令牌
    Account:5,          //钱包账户
    Phone: 6,           //手机号码
    Terminal: 7,        //授权终端编号
}

/**
 * 玩家状态
 */
const UserStatus = {
    /**
     * 空参数
     */
    none: 0,
    /**
     * 当前分享可以获得奖励
     */
    shareBonus: 1 << 1,
    /**
     * 有新的消息
     */
    newMsg: 1 << 3,
    /**
     * 新注册
     */
    isNewbie: 1<< 4,
    /**
     * 是否首次分享
     */
    isFirstShare: 1<< 5,
    /**
     * 当前在线
     */
    online: 1<<6,
    /**
     * 战斗中
     */
    gaming: 1<<7,
    /**
     * 是否执行了首次消费
     */
    isFirstPurchase: 1<<10,
    /**
     * 是否领取了首次消费奖励
     */
    isFirstPurchaseBonus: 1<<11,
    /**
     * 是否VIP
     */
    isVip: 1<<12,
    /**
     * 是否领取过新用户奖励
     */
    isGetNewbieBonus: 1<<13,
    /**
     * 有新的已完成任务
     */
    task: 1<<18,
};

/**
 * 排行榜类型
 */
const RankType = {
    total: 0,   //总榜
    daily: 1,   //日榜
    friend:2,   //好友榜
    battle:3,   //PVP榜
};

/**
 * 天赋的类型
 */
const PotentialType = {
    /**
     * 法宝
     */
    Equ: 1,
    /**
     * 图腾
     */
    Totem: 2,
    /**
     * 宠物（魔宠）
     */
    Pet: 3,
    /**
     * PVE伙伴
     */
    CPet: 4,
}

/**
 * 时效性技能的状态
 */
const ActionStatus = {
    /**
     * 正常状态。对于digital类型的技能，这是其唯一有效的状态
     */
    Normal: 1,
    /**
     * 有效期状态，对于coolDown类型的技能有效
     */
    Extension: 2,
    /**
     * 冷却期，对于coolDown类型的技能有效
     */
    CollDown: 3,
}

/**
 * 客户端请求返回值，统一定义所有的错误码，每100个为一个大类
 */
const ReturnCode = {
    Success: 0,             //操作成功
    userIllegal: 1,         //非法用户
    taskIllegalIdx:101,     //非法任务索引
    taskBonusHasGot:102,    //任务奖励已领取
    taskNotFinished:103,    //任务尚未完成
    buildLevelMax:201,      //建筑等级已达最大
    buildNeedNotRepair:202, //建筑物无需修复
    socialEnemyMoneyNotEnough:301,//敌人金币不足
    socialSimUserNotExist:302,  //指定目标用户不存在
    socialHelloCd:303,          //打招呼冷却中
    socialIsEnemy:304,          //当前是敌人
    socialIsFriend:305,         //当前是朋友
    socialMaxFriendNum:306,     //好友数量超限
    socialNoEnemyToSteal:307,   //没有发现合适的偷取对象
    socialNoEnemyToAttack:308,  //没有发现合适的攻击对象
    socialActionLimited:309,    //受限行为达到最大次数
    socialIsSlave:310,          //自己当前是奴隶
    socialMaxSlave:311,         //奴隶数量超出限制
    socialCatched:312,          //已被他人抓获
    socialCatchFailed:313,      //战斗失利，抓捕失败
    socialEscapeFailed:314,     //战斗失利，逃跑失败
    socialCatchedBySelf:315,    //已被自己抓获
    petActiveNotStart:401,      //宠物尚未开始孵化
    petNotExist:402,            //指定宠物不存在
    petMaxNum:403,              //达到宠物数量上限
    roleMaxLevel:404,           //角色达到最大等级
    itemNotExist:501,           //指定道具不存在
    itemNotEnough:502,          //指定道具数量不足
    itemHasOne:503,             //指定道具已拥有
    itemCanntExec:504,          //指定道具当前无法购买（比如体力满）
    timeTooShort: 601,          //关卡：用时太短
    timeTooLong: 602,           //关卡：用时太长
    actionNotEnough:603,        //关卡：体力不足
    toBeStarted:604,            //关卡：尚未开始
    inBattle: 605,              //关卡：战斗中
    inSweep: 606,               //关卡：扫荡中
    inBonus: 607,               //关卡：领奖中
    illegalScore:608,           //关卡：异常得分
    illegalGateId:609,          //关卡：异常关卡号
    slaveBattleNotRegister:610, //关卡：未注册（抓捕或起义）
    roleChipNotEnough:701,      //角色：角色碎片数量不足
    vipBonusGot:801,            //VIP：当日奖励已经领取
    activityBonusGot:901,       //活动：奖励已领取
    activityNoRankBonus:902,    //活动：没有上榜
    activityNoStart:903,        //活动：没有开始
    cannotAddProp:904,          //活动：预热时间已过无法进行投奖
    Error: 9000,                //未知错误
    illegalData:9001,           //非法数据
    EmptyData:9002,             //数据为空
    MoneyNotEnough:9003,        //金币不足
    ActionNotEnough:9004,       //体力不足
    dbError:9005,               //数据库错误
    authThirdPartFailed:9006,   //第三方平台校验失败
    routerFailed:9007,          //由于客户端上行了无法解析的路由信息，导致服务端路由失败
    tooManyConnections:9008,    //连接数太多
    DiamondNotEnough:9009,      //元宝不足
    RoleLeveltooLow:1001,       //角色等级过低
    activity_end:2001,
    activity_unready:2002,
    gate_GateNoError:2003,
    gate_MonsterNotEnough:2004,
    gate_BattleCheckError:2005,
    gate_BattleExpired:2006,
    gate_TimeToShort:2007,
    colldown:2008,
    itemNotExist:2009,
    Num_Limited:2010,
    NotEnough_Diamond:2011,
    NotEnough_Money:2012,
    NotEnough_Chip:2013,
    Level_Limited:2014,
    NotEnough_Num:2015,
    CanntActive:2016,
    HangUp:2018,
    PowerLimit:2019,
    MemberFull:2020,
    UserNotExist:2021,
    AllyNotExist:2022,
    HasAlly:2023,
    MemberReqNotExist:2024,
    DataNotExist:2025,
    HonorMember:2026,
    EnemyRelation:2027,
    SrcEnemyFull:2028,
    DstEnemyFull:2029,
    JoinAllyCD:2030,
    WaitingAgreeAdd:2031,
    BattleNotEnough:2032,
    HasNoAlly:2033,
    paramError:2034,
    redisError:2035,

    Hero_NotEnough_UpgradeChip:3001,    //英雄升级：缺少通用升级碎片
    Hero_NotEnough_EnhanceChip:3002,    //英雄升星：缺少转有升星碎片
    Hero_NotEnough_AdvChip:3003,        //英雄进阶：缺少专有升阶碎片
};

/**
 * 联盟个性化设定
 */
const AllySetting = {
    AS_None: 0,
    AS_Auto: 1,		        //自动收人
    AS_UnionDeny: 1 << 1,	//拒绝友盟申请
    AS_Battle:  1 << 2,	    //最低等级要求
    AS_SaveUser: 1 << 3,	//存储成员和盟主信息
    AS_SaveInfo: 1 << 4,	//存储联盟基础信息
}

const ReturnCodeName = {
    2001: '活动已结束',
    0:'操作成功',
    1:'非法用户',
    101:'非法任务索引',
    102:'任务奖励已领取',
    103:'任务尚未完成',
    201:'建筑等级已达最大',
    202:'建筑物无需修复',
    301:'敌人金币不足',
    302:'指定目标用户不存在',
    303:'打招呼冷却中',
    304:'当前是敌人',
    305:'当前是朋友',
    306:'好友数量超限',
    307:'没有发现合适的偷取对象',
    308:'没有发现合适的攻击对象',
    309:'受限行为达到最大次数',
    310:'自己当前是奴隶',
    311:'奴隶数量超出限制',
    312:'已被他人抓获',
    313:'战斗失利，抓捕失败',
    314:'战斗失利，逃跑失败',
    315:'已被自己抓获',
    401:'宠物尚未开始孵化',
    402:'指定宠物不存在',
    403:'达到宠物数量上限',
    404:'角色达到最大等级',
    501:'指定道具不存在',
    502:'指定道具数量不足',
    503:'指定道具已拥有',
    504:'指定道具当前无法购买',
    601:'关卡：用时太短',
    602:'关卡：用时太长',
    603:'关卡：体力不足',
    604:'关卡：尚未开始',
    605:'关卡：战斗中',
    606:'关卡：扫荡中',
    607:'关卡：领奖中',
    608:'关卡：异常得分',
    609:'关卡：异常关卡号',
    610:'关卡：未注册(抓捕或起义)',
    701:'角色：角色碎片数量不足',
    801:'当日奖励已经领取',
    901:'活动: 奖励已领取',
    902:'活动：没有上榜',
    903:'活动：没有开始',
    9000:'未知错误',
    9001:'非法数据',
    9002:'数据为空',
    9003:'金币不足',
    9004:'体力不足',
    9005:'数据库错误',
    9006:'第三方平台校验失败',
    9007:'由于客户端上行了无法解析的路由信息，导致服务端路由失败',
    9008:'连接数太多',
    9009:'元宝不足',
    2002: '活动未开始',
    2003: '当前关卡编号错误',
    2004: '消灭怪物数量未达标',
    2005: '战斗结果异常',
    2006: '战斗超时',
    2007: '用时太短，有外挂嫌疑',
    2008: '冷却时间未到',
    2009: '商品不存在',
    2010: '达到数量限制',
    2011: '元宝不足',
    2012: '金币不足',
    2013: '专属碎片不足',
    2014: '达到最大等级',
    2015: '通用：数量不足',
    2016: '无法激活图腾：关联魔宠未激活',
    2018: '处于挂机状态',
    2019: '权限不足',
    2020: '成员满',
    2021: '用户不存在',
    2022: '联盟不存在',
    2023: '已经加入了联盟',
    2024: '入盟申请不存在',
    2025: '数据不存在',
    2026: '荣誉会员，不能开除',
    2027: '敌对关系',
    2028: '己方宣战数量满',
    2029: '敌方宣战数量满',
    2030: '入盟CD中',
    2031: '等待批准加入',
    2032: '战力不足',
    2033: '没有加入联盟',
    2034: '参数不匹配',
    2035: '缓存管理器错误',    
};

/**
 * 通讯模式
 */
const CommMode = {
    ws: "webSocket",    //Web Socket
    http:"http",        //HTTP短连模式
}

/**
 * 好友类型
 * @type {{stranger: number, social: number, oneWay: number, twoWay: number, enemy: number}}
 */
const FriendType = {
    stranger: 0,        //陌生人
    social: 1,          //社交媒体上的好友
    oneWay: 2,          //单向好友，已关注
    twoWay: 3,          //双向好友，相互关注
    enemy: 4,           //敌人
};

/**
 * 下行消息类型
 */
const NotifyType = {
    none: 0,            //测试消息
    action: 1,          //体力数值结构推送
    chat:2,             //聊天消息
    mail:3,             //邮件
    status:4,           //状态：info.status字段

    buyItem: 1001,      //支付相关
    taskFinished: 2001, //任务完成
    taskChanged: 2002,  //任务改变
    socialSendAction: 3001,     //互动：赠送体力
    socialSendDog: 3002,        //互动：放狗
    socialSendShield: 3003,     //互动：赠送护盾
    socialSendHello: 3004,      //互动：点赞
    friends:3005,               //互动：好友列表（每次20条，可能多条）
    actions:3006,               //互动：下发受限行为列表，附带行为奖励
    socialBonusHello:3007,      //互动：收获点赞
    userStatus:3010,            //好友状态改变 0 离线 1 在线 2 游戏中

    //以下为奴隶相关
    slaveCatch: 3101,           //奴隶：抓捕 - 需要通关指定关卡，胜利后方可抓捕
    slaveCatched:3121,          //奴隶：抓捕结果
    slaveLash: 3102,            //奴隶：鞭挞 - 随机奖励
    slaveEscape: 3103,          //奴隶：起义 - 奴隶反抗，需要通关指定关卡，胜利后方可解放。
    slaveEscaped:3123,          //奴隶：起义结果
    slaveRansom: 3104,          //奴隶：赎身 - 使用赎身道具时触发，赎身道具可在商城中购买，或者直接元宝赎身，奴隶主获取部分收益
    slaveRelease:3105,          //奴隶：释放 - 系统自动触发，奴隶主获取全部收益
    slaveList:3106,             //奴隶：下发列表
    slaveFood: 3107,            //奴隶：给奴隶加餐
    slaveAvenge: 3108,          //奴隶：报复
    slaveFlattery: 3109,        //奴隶：谄媚
    slaveCommend: 3110,         //奴隶：表扬
    slaveFlatteryAdditional: 3111,//奴隶：谄媚附加消息
    //ealerRelease:3125,          //奴隶：被提前释放
    purchase:3150,              //购买行为次数
    //以上为奴隶相关

    vipBonus: 4001,             //VIP:获取每日奖励
    guide:5001,                 //启动新手引导
    guideBonus: 5002,           //获取新手奖励
    activityScoreBonus:6001,    //活动 - 分段积分奖励
    activityRankBonus:6002,     //活动 - 排名奖励
    activityScore:6000,         //活动分数
    firstShareBonus: 5003,           //首次分享

    // DailyActivityBonus:4100,      //七夕活动邮件类型
    DailyActivityBonus:4104,        //每日活动
    DailyEvent:4101,                //每日首次登陆
    DailyActivityState:4102,        //每日活动开关状态
    DailyActivityInstantBonus:4103, //活动中即时送出的奖励

    roleShare:7001,                 //角色分享
    sceneShare:7002,                //场景分享
    test: 9999,                     //test
};

/**
 * 订单状态
 * @type {{create: number, cancel: number, commit: number}}
 */
const PurchaseStatus = {
    create: 0,          //订单已生成
    prepay: 1,          //订单已支付 - client
    commit: 2,          //订单已支付 - server
    cancel: 3,          //订单已取消
};

/**
 * 加成模式
 * @type {{em_EffectCalc_Multiplication: number, em_EffectCalc_Addition: number, em_EffectCalc_Subduction: number, em_EffectCalc_Division: number}}
 */
const em_EffectCalcType = {
    em_EffectCalc_Multiplication: 1, //乘法，表示加持时，效果是按照百分比叠加的
    em_EffectCalc_Addition: 2,       //加法，标识加持时，效果是按照绝对值叠加的
    em_EffectCalc_Subduction: 3,     //减法，可以使用加法+负数实现
    em_EffectCalc_Division: 4,       //除法，可以使用乘法+小数实现
};

/**
 * 效果类型
 */
const em_Effect_Comm = {
    /**
     * 空
     */
    None:0,                 
    /**
     * 圣光加护效果提升 - OK
     */
    PotentialEffect: 1,
    /**
     * 新增20161211：增加技能4效果 - OK
     */
    Skill4_Enhance: 2,
    /**
     * Boss携带魂石数量提升 - 3
     */
    StoneGetNum: 3,
    /**
     * 宝箱怪金币/魂石掉落数量上升 - 此处宝箱怪特制随机事件中出现的宝箱怪 - OK
     */
    BoxMoney: 4,
    /**
     * 金币产出加成 - OK
     * 注 - 关于金币 ：在计数冲关状态下，金币可以在推进关卡进度时获取，也可以在通关时获取通关奖励。在无计数冲关状态下就只有离线收益。
     */
    MoneyOutput: 5,
    /**
     * 金币消耗下降 - OK
     */
    MoneyConsumeDiscount: 6,
    /**
     * 新增20161211：增加技能1时间 - OK
     */
    Skill1_Timer: 7,
    /**
     * 转生后初始金币增加 - OK
     */
    RevivalStartMoney: 8,
    /**
     * 转生后起始关卡增加 - OK
     */
    RevivalStartGate: 9,
    /**
     * 减少技能6的CD - OK
     */
    Skill6_Rcd: 10,
    /**
     * 减少技能5的CD - OK
     */
    Skill5_Rcd: 11,
    /**
     * 减少技能1的CD - OK
     */
    Skill1_Rcd: 12,
    /**
     * 宝箱怪出现几率 - OK
     */
    BoxRate: 13,
    /**
     * 延长技能6时长 - OK
     */
    Skill6_Timer: 14,
    /**
     * 降低技能6CD - OK
     */
    Skill2_Timer: 15,
    /**
     * 点击暴强 - 由客户端进行计算 - OK
     */
    DoubleAttackValue: 16,
    /**
     * 英雄之魂加成效果 - OK
     */
    StoneEffect: 17,
    /**
     * 延长技能3时长 - OK
     */
    Skill3_Timer: 18,
    /**
     * 十倍金币概率提升 - OK
     */
    TenMultiMoney: 19,
    /**
     * PVE攻击力转为点击攻击力 - OK
     */
    ConvertPveToClick: 20,
    /**
     * 降低技能4CD - OK
     */
    Skill4_Rcd: 21,
    /**
     * 延长技能4时长 - OK
     */
    Skill4_Timer: 22,
    /**
     * Boss携带魂石概率提升 - 23
     */
    StoneGetRate: 23,
    /**
     * 延长技能5时长 - OK
     */
    Skill5_Timer: 24,
    /**
     * 点击暴击概率 - 放在客户端处理 - OK
     */
    DoubleAttackRate: 25,
    /**
     * 降低技能2CD - OK
     */
    Skill2_Rcd: 26,
    /**
     * Boss血量下降 - 带入客户端计算 - 27
     */
    ReduceBossBlood: 27,
    /**
     * 减少普通关卡怪物数量 - OK
     */
    ReduceMonsterNum: 28,
    /**
     * 降低技能3CD - OK
     */
    Skill3_Rcd: 29,
    /**
     * 自动攻击次数 - OK
     */
    AutoAttack: 30,
    /**
     * 通用PVE战力加成（例如：所有宝物攻击增加） - 31
     */
    Attack: 31,
    /**
     * 每次攻击都掉钱 - OK
     */
    GetMoneyPerHit: 32,
    /**
     * 点击攻击力加成 - OK
     */
    AttackForClick: 33,
    /**
     * PVE攻击速度（英雄攻击速度） - OK
     */
    HeroAttackSpeed: 34,

    /**
     * 对金属性的Boss攻击加成 - OK
     */
    AttackToGold: 38,
    /**
     * 对木属性Boss攻击加成 - OK
     */
    AttackToWood: 41,
    /**
     * 对水属性Boss攻击加成 - OK
     */
    AttackToWater: 40,
    /**
     * 对火属性Boss攻击加成 - OK
     */
    AttackToFire: 42,
    /**
     * 对土属性Boss攻击加成 - OK
     */
    AttackToEarth: 43,
    /**
     * 对各类属性的Boss攻击加成 - OK
     */
    AttackToAll: 39,

    /**
     * 提升攻击力和点击攻击力 - OK
     */
    AttackAndClick: 44,
    /**
     * 25关开始，每逢20关时，通关奖励中获得额外的金币 - OK
     */
    MoneyOutput20: 45,
    /**
     * 主动技能冷却时间减少 - OK
     */
    SkillCooldownTime: 46,
    /**
     * 80关开始，每逢20关时，通关奖励中获得额外的魂石 - OK
     */
    StoneOutput20: 47,
    /**
     * 离线收益提升 - OK
     */
    OfflineBonus: 48,
    /**
     * 和转生次数正相关的PVE攻击力、点击攻击力加成 - OK
     */
    AttackForPveRevival: 49,
    /**
     * 降低法宝升级消耗 - OK 使用MoneyConsumeDiscount替代
     */
    EquUpgradeCost: 50,
    /**
     * 95关开始，每逢20关时，通关奖励中获得额外的圣光，但只能领取一次 - OK
     */
    PotentialOutput20: 51,
    /**
     * 体力恢复速度提升 - OK
     */
    RecoverAction: 102,
    /**
     * 自身PVE战力加成，只用于法宝战力内部计算 - OK
     */
    selfPower: 103,

    /**
     * * 宠物碎片掉落数量增加
     */
    PetChipDropNum: 231,
    /**
     * 主动技能生效时长增加 - OK
     */
    SkillContinueTime: 315,

    /**
     * 加快体力恢复速度, 配置加速百分比, 累计相加后按比例缩短体力恢复间隔
     */
    ActionRecover: 1002,       
    /**
     * 缩短体力恢复所用周期时间
     */
    DiscountActionTime:1003,   
    /**
     * 闯关和无尽金币收益增加
     */
    MoneyAdded:1004,           
    /**
     * 增加奴隶系统互动次数
     */
    InterOperation:1005,       

    /**
     * 攻击
     */
    HAttack:        501,       
    /**
     * 治疗
     */
    Recover:        502,       
    /**
     * 英勇 攻击
     */
    Valor:          503,       
    /**
     * 504 牺牲 生命
     */
    Sacrifice:      504,
    /**
     * 精神 暴击
     */
    Spirituality:   505,
    /**
     * 诚实 韧性
     */
    Honesty:        506,
    /**
     * 公正 命中
     */
    Justice:        507,
    /**
     * 谦卑 闪避
     */
    Hamility:       508,
    /**
     * 荣誉 精准
     */
    Honor:          509,
    /**
     * 怜悯 格挡
     */
    Compassion:     510,
    /**
     * 冷却回合
     */
    Fee:            511,       
};

const em_Effect_Name = {
    501:'攻击',
    502:'治疗',
    503:'英勇 攻击',
    504:'牺牲 生命',
    505:'精神 暴击',
    506:'诚实 韧性',
    507:'公正 命中',
    508:'谦卑 闪避',
    509:'荣誉 精准',
    510:'怜悯 格挡',
    511:'冷却回合',
}

/**
 * 特权加持模式一览表 注意每种特权只能指定一种加持模式
 *
 */
class MapOfTechCalcType {
    constructor(){
        this[em_Effect_Comm.None] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.ActionRecover] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.DiscountActionTime] = em_EffectCalcType.em_EffectCalc_Division;
        this[em_Effect_Comm.MoneyAdded] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.InterOperation] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.HAttack] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.Recover] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.Valor] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.Sacrifice] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.Spirituality] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.Honesty] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.Justice] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.Hamility] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.Honor] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.Compassion] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.Fee] = em_EffectCalcType.em_EffectCalc_Subduction;

        this[em_Effect_Comm.Skill1_Timer] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.Skill2_Timer] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.Skill3_Timer] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.Skill4_Timer] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.Skill5_Timer] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.Skill6_Timer] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.Skill1_Rcd] = em_EffectCalcType.em_EffectCalc_Division;
        this[em_Effect_Comm.Skill2_Rcd] = em_EffectCalcType.em_EffectCalc_Division;
        this[em_Effect_Comm.Skill3_Rcd] = em_EffectCalcType.em_EffectCalc_Division;
        this[em_Effect_Comm.Skill4_Rcd] = em_EffectCalcType.em_EffectCalc_Division;
        this[em_Effect_Comm.Skill5_Rcd] = em_EffectCalcType.em_EffectCalc_Division;
        this[em_Effect_Comm.Skill6_Rcd] = em_EffectCalcType.em_EffectCalc_Division;
        this[em_Effect_Comm.Skill4_Enhance] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.SkillCooldownTime] = em_EffectCalcType.em_EffectCalc_Division;
        this[em_Effect_Comm.SkillContinueTime] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.GetMoneyPerHit] = em_EffectCalcType.em_EffectCalc_Addition;
    
        this[em_Effect_Comm.RecoverAction] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.OfflineBonus] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.selfPower] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.Attack] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AutoAttack] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.AttackToWater] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AttackToWood] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AttackToEarth] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AttackAndClick] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AttackToFire] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AttackToAll] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AttackForClick] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AttackForPvp] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.ReduceBossBlood] = em_EffectCalcType.em_EffectCalc_Division;
        this[em_Effect_Comm.PotentialOutput20] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.EquUpgradeCost] = em_EffectCalcType.em_EffectCalc_Division;
        this[em_Effect_Comm.AttackForPveRevival] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.HeroAttackSpeed] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.MoneyOutput] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.MoneyOutput20] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.MoneyConsumeDiscount] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.StoneOutput20] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AltarOutput] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AltarGoldOutput] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AltarSilverOutput] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AltarStoneOutput] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AltarGoldOutputNum] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AltarSilverOutputNum] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.AltarStoneOutputNum] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.PetChipDropNum] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.PotentialEffect] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.BoxMoney] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.RevivalStartGate] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.ConvertPveToClick] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.TenMultiMoney] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.ReduceMonsterNum] = em_EffectCalcType.em_EffectCalc_Subduction;
        this[em_Effect_Comm.DoubleAttackRate] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.StoneEffect] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.DoubleAttackValue] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.StoneGetRate] = em_EffectCalcType.em_EffectCalc_Addition;
        this[em_Effect_Comm.RevivalStartMoney] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.BoxRate] = em_EffectCalcType.em_EffectCalc_Multiplication;
        this[em_Effect_Comm.StoneGetNum] = em_EffectCalcType.em_EffectCalc_Multiplication;
    }
}
let mapOfTechCalcType = new MapOfTechCalcType();

/**
 * 条件检测模式
 */
const em_Condition_Checkmode = 
{
    add: 1,         //累加检测
    absolute: 2,    //绝对值检测
}

/**
 * 检测条件类型枚举
 * 注：检测条件类型一旦定义就不要修改或删除，因为会影响到静态配置表和任务状态持久化字段
 */
const em_Condition_Type = {
    finishFirst: 1,         //首次（场）完成游戏
    buyRole: 2,             //每次购买任意角色
    buyRoad: 3,             //每次购买任意路径
    buyScene: 4,            //每次购买任意背景
    overFriend: 5,          //每次单次游戏游戏超越了好友排名
    overHistory: 6,         //每次单次游戏刷新最高分
    onRank: 7,              //首次登上总排行榜
    onRankDaily: 8,         //每天首次登上日排行榜
    onRankFriendOfWeek: 9,  //每周首次登上好友排行榜
    roundScore: 10,         //单次游戏获得分数
    roundMoney: 11,         //单次游戏获得游戏币个数
    death: 12,              //累计死亡次数
    totalMoney: 13,         //累计从游戏获得的游戏币
    totalRound: 14,         //累计进行游戏次数
    totalRevive: 15,        //累计使用复活道具次数
    orderOfRankTotal: 16,   //总排行榜达到过前若干名
    orderOfRankDaily: 17,   //日排行榜达到过前若干名
    orderOfRankFriend: 18,  //好友排行榜达到过前若干名
    totalSpendMoney: 19,    //累计花费游戏币个数
    totalLogin: 20,         //累计登陆游戏天数
    totalShare: 21,         //累计进行分享次数
    totalRole: 22,          //累计拥有角色个数
    totalRoad: 23,          //累计拥有路径个数
    totalScene: 24,         //累计拥有背景个数
    getRole: 25,            //拥有某个角色
    getRoad: 26,            //拥有某个路径
    getScene: 27,           //拥有某个背景
    useRole1002: 28,        //使用指定角色进行游戏的次数
    useRoad: 29,            //使用指定路径进行游戏的次数
    useScene2002: 30,       //使用指定背景进行游戏的次数
    gatePassNum: 31,        //通关次数
    gateMaxNo: 32,          //通关最高关卡
    useAction: 33,          //使用体力
    onRankCompany: 34,      //每天首次登上公司排行榜
    gateStar:35,            //累计获得的星星总数
    totalSpendDiamond: 36,  //累计花费钻石个数
    totalSlaveCatch:37,     //累计抓捕指定数量奴隶
    totalPurchase:38,       //累计充值
    shareOfFail: 101,       //战斗失败时的分享
    shareOfLackAction:102,  //缺乏体力时的分享
    login: 201,             //登录
    loginAgain: 202,       //多次登录
    loginContinue: 203,    //连续登录
    deal: 204,             //充值
    level: 205,            //战力等级
    tollgateCurNo: 206,    //当前关卡，用于一些实时检测中，例如结束挂机时依次计算所有关卡的通关奖励
    tollgateMaxNo: 207,    //历史最高关卡
    cpetUpgrade: 208,      //提升宠物等级
    tollgatePass: 209,     //累计通关关卡数目
    equUpgrade: 210,       //累计提升法宝等级
    attackBoss: 211,       //攻击Boss
    offlineBonus: 212,     //收取离线收益
    totemUpgrade: 213,     //升级图腾
    getStone: 214,         //获得魂石
};

/**
 * 任务状态枚举
 * 注：只是使用静态类简单模拟枚举类型（下同），因此并不支持默认值、检测枚举值是否定义等枚举特性，有兴趣的童鞋可以自行扩展
 */
const em_task_status =
{
    init: 0,         //初始状态
    award: 1,        //待领奖状态
    finished: 2,     //完成状态 - 对主线任务，一旦完成会停留在此状态；对日常任务，一旦完成会停留在该状态直至第二天登录；对循环任务，一旦完成会自动恢复为初始状态
}

/**
 * 任务类型枚举
 */
const em_task_type =
{
    main: 1,         //主线
    daily: 2,        //日常
    recy: 3,         //循环

    dailyHead: 2000,//日程任务字头
    recyHead: 3000, //循环任务字头
}

/**
 * 新手引导
 * @note
 *      condition:是否可以推进到下一步的限定条件，目前未启用
 *      next：本步骤对应的下一个步骤
 *      rec：是否是一个记录点，如果不是则即使完成本步骤也不会记录
 *      bonus：完成本步骤可以领取的奖励
 */
const GuideList = {
    0 : {condition:[], next:1, rec:true},
    1 : {condition:[{type:em_Condition_Type.totalMoney, num:100}], next:2, rec:true},
    2 : {condition:[{type:em_Condition_Type.totalMoney, num:100}], next:3, rec:true},
    3 : {condition:[{type:em_Condition_Type.totalMoney, num:100}], next:0, rec:true, bonus:[{type:ResType.Diamond,num:100}]},
};

/**
 * 关卡类型
 */
const TollgateType = {
    SmallGate: 1,
    MediumGate: 2,
    BigGate: 3,
};

const TollgateState = {
    idle: 0,    //空闲
    start: 1,   //战斗中
    sweep: 2,   //扫荡中
    bonus: 3,   //等待领取扫荡收益
};

/**
 * 直销类型定义
 */
const PurchaseType = {
    /**
     * 分配圣光
     */
    totemAssign: 1,
    /**
     * 挂机
     */
    hangUp: 2,
    /**
     * 结束挂机
     */
    EndHangup: 3,
    /**
     * 消除主动技能的CD
     */
    clearCd: 4,
    /**
     * 强制完成任务
     */
    finishTask: 5,
    /**
     * 抽卡
     */
    RandomCard: 6,
}

const AllyRelationEnum = {
    Ro_Union: 1,     //联盟关系
    Ro_Normal: 2,    //普通关系
    Ro_Ally: 3,      //同一个盟
    Ro_Enemy: 4,     //敌盟
    Ro_ReqUnion: 5,
    Ro_BeReqUnion: 6,
    Ro_BeReqMember: 7,
    Ro_ReqMember: 8,
}

/**
 * 联盟新闻类型
 */
const AllyNewsType = {
    BeUnion: 1,
    Donate: 2,
    LeaderChange: 3,
    AllyUpgrade: 4,
    MemberEnter: 5,
    MemberLeave: 6,
    MemberKick: 7,
    AllyCreate: 8,
    BeRemoveUnion: 9,
    DenyUnion: 10,
    BeRemoveEnemy: 11,
}

/**
 * 联盟权限
 */
const AllyPower = {
    ap_Terminate: 1, //解散联盟
    ap_Join: 2,      //加人
    ap_Kick: 3,      //踢人
    ap_Union: 4,     //结盟 解盟
    ap_Enemy: 5,     //敌盟 解除敌盟
    ap_Setting: 6,   //修改联盟设定
}

/*
 * 用户事件枚举
 */
const EventEnum = {
    Enemy: 1,//遭遇其他玩家
    BossAppear: 2,//遭遇宝箱怪
    BossAttack: 102,//攻击宝箱怪(金币类型)，该事件由“BossAppear”点击后转化而来
    BossStoneAttack: 202,//攻击宝箱怪（魂石类型），该事件由“BossAppear”点击后转化而来
    Rabbit: 3,//小飞兔
}

/**
 * 副本随机事件配置信息
 * Class EventConfig
 * @package App\Logic\UserEvent
 */
const EventConfig = {
    eventList: null,

    /**
     * 获取事件配置表
     * type: 事件类型 expired 持续时间 为0表示永久有效
     *
     * @return array
     */
    getEvents: () => {
        if(EventConfig.eventList == null){
            EventConfig.eventList = {};
            EventConfig.eventList[EventEnum.BossAppear] = {'type': EventEnum.BossAppear, 'expired': 30, 'action': 0, 'random': true};
            EventConfig.eventList[EventEnum.BossAttack] = {'type': EventEnum.BossAttack, 'expired': 30, 'action': 0, 'random': false};
            EventConfig.eventList[EventEnum.BossStoneAttack] = {'type': EventEnum.BossStoneAttack, 'expired': 30, 'action': 0, 'random': false};
            EventConfig.eventList[EventEnum.Enemy] = {'type': EventEnum.Enemy, 'expired': 30, 'action': 0, 'random': true};
            EventConfig.eventList[EventEnum.Rabbit] = {'type': EventEnum.Rabbit, 'expired': 0, 'action': 3, 'random': true};
        }
        return EventConfig.eventList;
    }
}


/**
 * 技能类型
 */
const ActionType = {
    /**
     * 按照数量使用
     */
    digital: 1,
    /**
     * 按照冷却时间使用
     */
    coolDown: 2,
}

/*
 * 用户权限枚举
 */
const UserAuthorityNum = {
    IsVip: 1 << 0,           //是否VIP
    VipAward1: 1 << 1,       //VIP第一个奖励是否领取
    VipAward2: 1 << 2,       //VIP第二个奖励是否领取
};

/**
 * 邀请类别
 */
const InviteType = {
    /**
     * 入盟申请
     */
    AllyReq: 1,
    /**
     * 加盟邀请
     */
    AllyInvite: 2,
}

const ShopTypeEnum = {
    /**
     * 钻石商城
     */
    diamond: 1 << 0,
    /**
     * 金币商城
     */
    Gold: 1 << 1,
    /**
     * 普通商店
     */
    common: 1 << 2,
    /**
     * 神秘商店
     */
    secret:  1 << 3,
};

const em_Ally_Oper = {
    /**
     * 查询排名
     */
    query: 1,
    /**
     * 查询用户资料
     */
    find: 2,
    /**
     * 创建联盟
     */
    create: 3,
    /**
     * 删除联盟
     */
    del: 5,
    /**
     * 申请入盟
     */
    req: 6,
    /**
     * 退盟
     */
    quit: 7,
    /**
     * 获取入盟申请列表
     */
    reqList: 8,
    /**
     * 通过入盟申请
     */
    reqAllow: 9,
    /**
     * 拒绝入盟申请
     */
    reqDeny: 14,
    /**
     * 交互邀请列表
     */
    inviteList: 10,
    /**
     * 同意加盟
     */
    inviteAllow: 11,
    /**
     * 取消或拒绝
     */
    inviteCancel: 12,
    /**
     * 邀请加盟
     */
    invite: 13,
}

/**
 * 系统实体类，例如用户、联盟、邮件等
 */
const EntityType = {
    Ally:0,         //联盟
    User:1,         //用户
    AllyNews:2,     //联盟新闻
    Mail:3,         //邮件
    BuyLog:4,       //消费流水记录
}

/**
 * 中间件参数对象
 */
const MiddlewareParam = {
    /**
     * 通讯组件
     */
    socket:null, 
    /**
     * 消息
     */
    msg:{}, 
    /**
     * 回调函数
     */
    fn: null, 
    /**
     * 中继标志：true 按顺序传递信息流到下一个中间件 false 终止传递
     */
    recy:true, 
    /**
     * 核心对象
     */
    facade: null
};

/**
 * 技能类型/卡牌类型
 */
const SkillType = {     // 技能类型枚举
    Counter: 1,         // 反击，格挡后几率触发反击原攻击者
    Attack: 2,          // 普通攻击
    Recover: 3,         // 恢复，恢复友军生命
    Encourage: 4,       // 鼓舞，增加友军士气
    ConfuseAttack: 7,   // 混乱状态下发动的攻击
    AddDeBuff: 8,       // 附加负面状态
    JianCi: 13,         // 尖刺，反弹30%伤害
    Blood: 15,          // 血爆，死亡时对全体敌人造成伤害
    Alive: 16,          // 重生
    AddBuff: 17,        // 增加正面状态
    Illusion: 18,       // 幻象 在随机空位生成自身复制品
    XueZhou: 19,        // 血咒 秒杀被攻击者
    BloodRecover: 20,   // 嗜血
    GodBless: 21,       // 祈福
    Summon:24,          // 召唤
    XianJi: 34,         // 献祭
    QuSan: 35,          // 驱散
    LiZhi: 37,          // 励志
    DongCha: 38,        // 洞察
    BeDead:42,          //求生
    IncreaseAura:44,    //提供全体光环
    Unity:49,           //团结 号召所有队友帮助分担伤害
    IncreaseLocal:50,   //提供本身光环
    Enchant:52,         //魅惑
    Attach:53,          //追加装备
    Study:54,           //偷师
    Insight:55,         //顿悟
};

/**
 * 卡牌稀有度
 */
const RarityType = {
    /**
     * 普通  白色
     */
    Lv1: 1,
    /**
     * 精英  绿色
     */
    Lv2: 2,
    /**
     * 稀有  蓝色
     */
    Lv3: 3,
    /**
     * 传说  紫色
     */
    Lv4: 4,
    /**
     * 史诗  橙色
     */
    Lv5: 5,
}

/**
 * 活动的类型枚举，注意值要连续设置（base 0）
 */
const ActivityType = {
    None: 0,
};
ActivityType.len = Object.keys(ActivityType).length; //枚举的数量
/**
 * 不同类型活动的分数转化率
 */
const ActivityScoreRate = {
    0:1,
}

/**
 * 活动的状态枚举
 */
const DailyActivityStatus = {
    Idle: 'Idle',       //空闲状态
    Active: 'Active',   //活跃状态
    Bonus: 'Bonus',     //奖励展示状态
    Ready: 'Ready',     //预热
    End:'End',          //活动结束
};

/**
 * 活动的状态枚举
 */
const ActivityStatus = {
    Idle: 'Idle',       //空闲状态
    Active: 'Active',   //活跃状态（周一到周六）
    Bonus: 'Bonus',     //奖励展示状态（周天）
};

const ActivityRankMax = 100000; //最大可获奖的排名

exports = module.exports = {
    ActivityRankMax: ActivityRankMax,
    ActivityType: ActivityType,
    ActivityStatus: ActivityStatus,
    ActivityScoreRate: ActivityScoreRate,
    DailyActivityStatus:DailyActivityStatus,
    em_Ally_Oper:em_Ally_Oper,
    UserAuthorityNum:UserAuthorityNum,
    ResType: ResType,
    GetResType: GetResType,
    ActionType:ActionType,
    AllyPower:AllyPower,
    AllyNewsType:AllyNewsType,
    AllyRelationEnum:AllyRelationEnum,
    AllySetting: AllySetting,
    PurchaseType:PurchaseType,
    ReturnCode: ReturnCode,
    ReturnCodeName: ReturnCodeName,
    FriendType: FriendType,
    NotifyType: NotifyType,
    PurchaseStatus: PurchaseStatus,
    em_EffectCalcType: em_EffectCalcType,
    em_Effect_Comm: em_Effect_Comm,
    em_Effect_Name: em_Effect_Name,
    mapOfTechCalcType: mapOfTechCalcType,
    UserStatus: UserStatus,
    RankType: RankType,
    em_Condition_Checkmode: em_Condition_Checkmode,
    em_Condition_Type: em_Condition_Type,
    em_task_status: em_task_status,
    em_task_type: em_task_type,
    ActionExecuteType: ActionExecuteType,
    TollgateType: TollgateType,
    TollgateState: TollgateState,
    CommMode: CommMode,
    GuideList: GuideList,
    IndexType: IndexType,
    EventConfig: EventConfig,
    EventEnum: EventEnum,
    PotentialType:PotentialType,
    ActionStatus:ActionStatus,
    MAX_INT:MAX_INT,
    ShopTypeEnum:ShopTypeEnum,
    InviteType:InviteType,
    EntityType:EntityType,
    MiddlewareParam:MiddlewareParam,
    SkillType:SkillType,
    RarityType:RarityType,
};
