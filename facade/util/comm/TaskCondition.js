let facade = require('../../Facade')
let constList = facade.const

//数值比小的条件类型集合
let minCondition = new Set([
    constList.em_Condition_Type.onRank,
    constList.em_Condition_Type.onRankDaily,
    constList.em_Condition_Type.onRankFriendOfWeek,
]);

/**
 * 条件检测对象
 * 一个任务可能包含多个条件，所有条件满足才算完成并进入待领奖状态
 */
class TaskCondition
{
    constructor(){
        this.type = constList.em_Condition_Type.totalLogin;    //条件类型
        this.threshold = 0;                      //条件完成的判定阈值，从静态表中获取
        this.value = 0;                          //条件当前完成量，初始一律为0，当累计到判定阈值时即表示条件满足。中间缓存量保存在内存中，并持久化到数据库
        this.start = 0;
        this.end = 0;
    }

    /**
     * 条件的序列化
     */
    ToString(){
        return `${this.type},${this.value}`;
    }

    /**
     * 判断条件是否完成
     */
    finished(){
        if(minCondition.has(this.type)){
            return this.value <= this.threshold;
        }
        else{
            return this.value >= this.threshold;
        }
    }

    /**
     * 条件重新初始化
     */
    Init() {
        this.value = 0;
    }
}

exports = module.exports = TaskCondition;
