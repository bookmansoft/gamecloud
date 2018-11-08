let facade = require('../../../../facade/Facade')
let {EntityType, AllySetting, em_Ally_Oper, InviteType, PurchaseType, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = facade.UserEntity

/**
 * 联盟管理
 */
class P777003 extends facade.Control 
{
    /**
     * @brief  报文编号 777001
     *
     * @date   2016.10.12
     *
     * @param {UserEntity} user
     * @param  :
     * 名称        | 类型     | 描述
     * ------------|----------|--------------------
     * oper        | int      | 操作类型 1查询列表 2查询指定用户
     * id          | int      | 指定用户ID
     * page        | int      | 指定查询页码
     *
     * @return
     * 名称        | 类型     | 描述
     * ------------|----------|----------------------
     * code        | int      | 返回码
     * data        | object   | 返回的数值对象
     * .rank       | int      | 自身排名
     * .items      | array    | 前50名玩家列表
     *
     * @note
     */
    async Execute(user, objData) {
        objData.oper = parseInt(objData.oper);
        objData.id = parseInt(objData.id);

        let $data = new D777003();
        let $code = ReturnCode.Success;

        switch(objData.oper){
            case em_Ally_Oper.reqList:
                $ally = facade.GetObject(EntityType.Ally, objData.id);
                if($ally != null){
                    $data.ally = $ally;
                    $data.items = $ally.ReqGetList();
                }
                break;
            
            case em_Ally_Oper.reqDeny:
                $ao.ReqDeny(objData.id);
                //向发起者发送通知
                facade.current.notifyEvent('ally.reqDeny', {aid:$ao['aid'], src:user.id, dst:objData.id});
                break;

            case em_Ally_Oper.reqAllow:
                if(!$ao){
                    $code = ReturnCode.AllyNotExist;
                }
                else{
                    $code = $ao.ReqAllow($user, objData.id);
                }

                break;
        }
        return {code:$code, data: $data};
    }

    GetRanks($ao, user, $data){
        let $page_max = $ao.GetPagesOfMember();
        let $page = Math.max(1, Math.min(parseInt(objData.page), $page_max));
        $data.page = $ao.GetPageOfMemberWithUid($page, user['id'], $data.items);
        $data.total = $page_max;
    }
}

/**
 * 返回报文 Class D777003
 */
class D777003
{
    constructor(){
        /**
         * 联盟信息
         * @var
         */
        this.ally = {};
        /**
         * 前50名用户排序，包含id, name, rank
         * @var array
         */
        this.items = [];
    }
}

exports = module.exports = P777003;
