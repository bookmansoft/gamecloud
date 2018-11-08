let facade = require('../../Facade')
let constList = facade.const
let TaskCondition = require('./TaskCondition')

/*
 * 条件管理器
 */
class TaskConditionManager
{
    constructor(){
        this.conList = {};//条件列表
    }

    /*
     * 判断任务是否完成
     */
    finished(){
        return Object.keys(this.conList).reduce((sofar, cur)=>{return sofar && this.conList[cur].finished()}, true);
    }

    /**
     * 条件完成情况
     */
    finishing(){
        return Object.keys(this.conList).map(cur=>{
            return {id:cur, num:this.conList[cur].value};
        });
    }

    /*
     * 根据外部条件的变化，推进条件内部值变化
     * @cType: em_condition_type
     */
    Execute($cType, $num, $mode){
        let ret = false;
        let conn = this.conList[$cType];
        if(!!conn){
            if(!!conn.start && conn.start > facade.util.now()){
                return false;
            }

            if(!!conn.end && conn.end < facade.util.now()){
                return false;
            }

            ret = true;
            switch($mode){
                case constList.em_Condition_Checkmode.add:
                    conn.value += $num;
                    break;
                case constList.em_Condition_Checkmode.absolute:
                    conn.value = $num;
                    break;
            }
        }
        return ret;
    }

    /**
     * 是否拥有某种条件
     * @param {*}  
     */
    hasCondition($cType){
        return !!this.conList[$cType];
    }

    /*
     * 设置指定条件的阈值
     */
    fillMaxValue($cType, $num, $start=0, $end=0){
        if(!this.conList[$cType]){
            this.conList[$cType] = new TaskCondition();
        }
        this.conList[$cType].type = $cType;
        this.conList[$cType].threshold = $num;
        this.conList[$cType].start = $start;
        this.conList[$cType].end = $end;
    }

    /*
     * 设置指定条件的当前完成值
     */
    fillCurValue($cType, $num){
        if(!this.conList[$cType]){
            this.conList[$cType] = new TaskCondition();
        }
        this.conList[$cType].type = $cType;
        this.conList[$cType].value = $num;
    }

    /*
     * 重新初始化
     * 循环任务完成后，再次开始执行前需要初始化
     */
    Init(){
        Object.keys(this.conList).map(id=>{
            this.conList[id].Init();
        });
    }

    /*
     * 序列化
     * 条件管理器中携带条件完成前的中间状态值，所以需要序列化后进行持久化保存
     */
    ToString() {
        let $ret = '';
        Object.keys(this.conList).map(id=>{
            if($ret != ''){
                $ret = $ret + ';';
            }
            $ret = $ret + this.conList[id].ToString();
        });
        return $ret;
    }
}

exports = module.exports = TaskConditionManager;