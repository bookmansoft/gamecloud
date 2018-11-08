let facade = require('../../../../facade/Facade')
let {em_task_status, em_Condition_Checkmode, em_Condition_Type, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = require('../../../model/entity/UserEntity')

/**
 * 任务查询
 */
class P101000 extends facade.Control {
    /**
     * @brief  报文编号 101000：查询主线任务列表
     *
     * @date   2016.10.12
     *
     * @param {UserEntity} user
     * @param  :
     * 名称        | 类型     | 描述
     * ------------|----------|--------------------
     * oper        | int     | 操作类型 0 查询任务列表（包含成就 1 获得任务奖励 2 强制完成任务
     * id          | int     | 请求强制完成任务或获得任务奖励的任务编号 1000~ 主线任务 2000~ 每日任务 3000~ 循环任务 
     * 
     * @return
     * 名称        | 类型     | 描述
     * ------------|----------|----------------------
     * code        | int      | 返回码
     * data        | object   | 返回的数值对象
     * .items      | array    | 任务列表
     */
    async Execute(user, input) {
        let $tm = user.getTaskMgr().taskList;
        let $tb = user.getTaskMgr().staticList;
        let $data = new D101000();
        input.oper = parseInt(input.oper)||0;
        input.id = parseInt(input.id)||0;
        let $code = ReturnCode.Success;
        switch (input.oper){
            case 0:
                break;
            case 1:
                let $ret = user.getTaskMgr().getBonus(input.id);
                if($ret != '-1' && $ret != '-2'){
                    $data.bonus = $ret;
                }
                else{
                    $code = ReturnCode.paramError;
                }
                break;
            case 2:
               $code = user.getTaskMgr().forceFinish(input.id); 
               break;
            default:
                break;
        } 
        
        for(let obj of Object.values($tb)){
            if($tm[obj.id]) {
                $tb[obj.id].status = $tm[obj.id].status;
                $tb[obj.id].time = $tm[obj.id].time;
                $tb[obj.id].conditionMgr = $tm[obj.id].conditionMgr;
                $tb[obj.id].front = $tm[obj.id].front;
                $tb[obj.id].layer = $tm[obj.id].layer;
            }
        }
        $data.items = $tb;
             
        return {code: $code, data: $data};
    }
}

/**
 * 返回报文 Class D101000
 */
class D101000
{
    constructor(){
        /**
         * 任务列表
         * @var
         */
        this.items = {};
    }
}

exports = module.exports = P101000;
