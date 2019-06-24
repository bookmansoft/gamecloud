let facade = require('../../Facade')
let constList = facade.const
let commonFunc = facade.util
let BonusObject = require('./BonusObject')
let TaskConditionManager = require('./TaskConditionManager')
let BonusList = {}

/**
 * 任务对象
 */
class TaskObject 
{
    constructor() {
        this.id = 0;                         //任务唯一编号
        this.status = constList.em_task_status.init;  //任务状态
        this.time = 0;
        this.conditionMgr = new TaskConditionManager();   //条件管理器
    }

    GetBonus($user){
        $user.getBonus(BonusObject.convert(BonusList[this.id]));
        return BonusList[this.id];
    }

    toClient(){
        return {id:this.id, status:this.status, time:this.time, value:this.conditionMgr.conList[(Object.keys(this.conditionMgr.conList))[0]].value};
    }

    /*
     * 序列化任务对象，用于持久化存储
     *   task_str = 任务信息|条件信息
     *   任务信息 = 任务ID，任务状态
     *   条件信息 = 条件编号，条件当前值[;更多条件]
     */
    ToString(){
        return `${this.id},${this.status},${this.time}|${this.conditionMgr.ToString()}`;
    }

    /*
     * 从静态配置表中，获取并填充条件阈值和奖励信息
     */
    loadFromStatic(core) {
        let curItem = core.fileMap.task[this.id];

        curItem.condition.split(';').map($value2=>{
            let $staticConItem = $value2.split(',');
            if($staticConItem.length == 4){
                this.conditionMgr.fillMaxValue(
                    parseInt($staticConItem[0]), 
                    parseInt($staticConItem[1]), 
                    parseInt($staticConItem[2]), 
                    parseInt($staticConItem[3])
                );
            }
            else if($staticConItem.length == 2)
            {   
                this.conditionMgr.fillMaxValue(parseInt($staticConItem[0]), parseInt($staticConItem[1]));
            }
        });

        if(!BonusList[this.id]){
            BonusList[this.id] = curItem.bonus;//缓存奖F励字符串 
        }

        if(!!curItem.front && !!curItem.layer){
            this.front = parseInt(curItem.front);   //前置条件
            this.layer = curItem.layer;             //嵌套层次
        }
    }

    /*
     * 初始化：状态和条件值
     */
    Init()  {
        this.status = constList.em_task_status.init;
        this.time = 0;
        this.conditionMgr.Init();
    }

    /**
     * 根据外部条件的变化，推进条件内部值变化
     * @param $cType        检测的条件类型
     * @param $num          数值变化
     * @param $mode         检测模式：增量/绝对值
     */
    Execute($cType, $num, $mode = constList.em_Condition_Checkmode.add) {
        if(this.conditionMgr.Execute($cType, $num, $mode)){//测试任务条件是否发生了变化
            if(this.status == constList.em_task_status.init){
                if(this.conditionMgr.finished()){
                    //表示任务从未完成变为了完成
                    this.status = constList.em_task_status.award; //将任务状态从未完成修改为待领奖
                    this.time = commonFunc.now();
                    return true;
                }
                else{
                    return this.conditionMgr.finishing();   //表示虽然没有完成，但是进度前进了
                }
            }
        }
        return false; //表示进度和完成状态没有发生变化
    }

    /*
     * 返回任务类型
     */
    getType() {
        if(this.id > constList.em_task_type.recyHead){
            return constList.em_task_type.recy;
        }
        else if (this.id > constList.em_task_type.dailyHead){
            return constList.em_task_type.daily;
        }
        else{
            return constList.em_task_type.main;
        }
    }
}

exports = module.exports = TaskObject;