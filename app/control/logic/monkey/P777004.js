let facade = require('../../../../facade/Facade')
let {AllySetting, em_Ally_Oper, InviteType, PurchaseType, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = facade.UserEntity
let PotentialClientItem = require('../../../../facade/util/potential/PetClientItem')
let AllyObject = facade.EntityList.AllyObject

/**
 * 联盟管理
 */
class P777004 extends facade.Control
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
        objData.type = parseInt(objData.type);

        let $data = new D777004();
        let $code = ReturnCode.Success;

        switch(objData.oper){
            case em_Ally_Oper.inviteList:
                break;

            case em_Ally_Oper.inviteAllow: //只对加盟邀请有效
                if(objData.type == InviteType.AllyInvite){
                    $code = AllyObject.InviteAccept(user, objData.id);
                }
                break;

            case em_Ally_Oper.inviteCancel:
                if(objData.type == InviteType.AllyInvite){
                    $code = AllyObject.InviteCancel(user, objData.id);
                }
                else if(objData.type == InviteType.AllyReq){
                    $code = $ao.ReqCancel(user); //get ao by objData.id
                }
                break;

            case em_Ally_Oper.invite: //邀请加盟
                $code = AllyObject.InviteSubmit(user, objData.id);
                break;
        }
        for(let $value of user.getInviteMgr().Value(InviteType.AllyReq)){
            $data.items.push({type: InviteType.AllyReq, num: $value});
        }
        for(let $value of user.getInviteMgr().Value(InviteType.AllyInvite)){
            $data.items.push({type: InviteType.AllyInvite, num: $value});
        }
    
        return {code:$code, data: $data};
    }
}

/**
 * 返回报文 Class D777004
 */
class D777004
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

exports = module.exports = P777004;
