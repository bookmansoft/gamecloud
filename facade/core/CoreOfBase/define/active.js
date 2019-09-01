/**
 * 活动的类型枚举，注意值要连续设置（base 0）
 */
const ActivityType = {
    /**
     * 鸡小德
     */
    // Action: 0,       //累计花费的体力
    // Money: 1,        //累计花费的金币
    // Diamond:2,          //累计花费的钻石
    // Gate:3,             //累计通关次数
    // Revive:4,           //累计复活次数
    // Slave:5,            //累计抓取奴隶
    /**
     * 猴子
     */
    Money:0,          //累计花费的金币
    Diamond: 1,        //累计花费的钻石    
};
ActivityType.len = Object.keys(ActivityType).length; //枚举的数量

/**
 * 不同类型活动的分数转化率
 */
const ActivityScoreRate = {
    0:10,
    1:1,    
    // 2:1,
    // 3:1,
    // 4:1,
    // 5:1,
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
};
