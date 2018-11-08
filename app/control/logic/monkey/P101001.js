let facade = require('../../../../facade/Facade')
let {em_task_status, em_Condition_Checkmode, em_Condition_Type, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = facade.UserEntity

/**
 * 任务系统报文：领取奖励 -1表示任务不存在，-2表示任务条件不满足，其余表示奖励字符串
 */
class P101001 extends facade.Control {
    /**
     * @brief  报文编号 101001：上行此报文，领取已完成任务的奖励
     *
     * @date   2016.10.12
     *
     * @param {UserEntity} user
     * @param  :
     * 名称        | 类型     | 描述
     * ------------|----------|--------------------
     * id          | int      | 指定领奖的任务编号
     * oper        | int      | 操作类型 0 领取 1 强制完成
     *
     * @return
     * 名称        | 类型     | 描述
     * ------------|----------|----------------------
     * code        | int      | 返回码
     * data        | object   | 返回的数值对象
     * .bonus      | string   | -1表示任务不存在，-2表示任务条件不满足，其余表示奖励字符串
     */
    async Execute(user, objData) {
        let $tm = user.getTaskMgr();
        let $data = new D101001();
        let $ret = $tm.GetTaskBonus(objData.id, objData.oper);
        if($ret.code == ReturnCode.Success){
            $data.bonus = $ret.bonus;
            $data.items = $tm.filter($value => {
                return ( $value.status != em_task_status.finished
                    && (!$value.front || $tm.taskList[$value.front].status == em_task_status.finished)
                );
            });
        }
        return {code: $ret.code, data: $data};
    }
}

/**
 * 返回报文 Class D101001
 */
class D101001
{
    constructor(){
        /**
         *  -1表示任务不存在，-2表示任务条件不满足，其余表示奖励字符串
         * @var
         */
        this.bonus;
        /**
         * 任务列表
         * @var
         */
        this.items = {};
    }
}

exports = module.exports = P101001;
