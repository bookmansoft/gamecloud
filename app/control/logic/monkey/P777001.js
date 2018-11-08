let facade = require('../../../../facade/Facade')
let {EntityType, IndexType, AllySetting, em_Ally_Oper, InviteType, PurchaseType, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = facade.UserEntity
let AllyObject = facade.EntityList.AllyObject

/**
 * 联盟管理
 */
class P777001 extends facade.Control
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

        let $data = new D777001();
        let $code = ReturnCode.Success;

        //联盟ID有效性验证
        if(user.aid > 0){
            user.getInviteMgr().Clear(InviteType.AllyReq, user.aid);
            user.getInviteMgr().Clear(InviteType.AllyInvite, user.aid);

            let $ao = facade.GetObject(EntityType.Ally, user.aid);
            if(!$ao){//指定联盟不存在
                user.aid = 0;
            }
            else{//进一步检测用户是否该联盟成员
                let $am = $ao.GetMember(user['id']);
                if(!$am){
                    user.aid = 0;
                }
            }
        }

        switch(objData.oper){
            case em_Ally_Oper.query:
                this.GetRanks(user, $data, objData);
                break;

            case em_Ally_Oper.create:
                $code = await AllyObject.AllyCreate(user);
                this.GetRanks(user, $data, objData);
                break;

            case em_Ally_Oper.del:
                $code = AllyObject.AllyTerminate(user);
                this.GetRanks(user, $data, objData);
                break;

            case em_Ally_Oper.req:
                if(user['aid'] > 0){
                    $code = ReturnCode.HasAlly;//已经入盟
                    break;
                }

                $code = ReturnCode.Success;
                let $ao = facade.GetObject(EntityType.Ally, objData.id);
                let $isCheck = $ao.Check(AllySetting.AS_Battle);
                if($isCheck && !$ao.CheckBattle(user['rank'])){//有最低战力要求
                    $code = ReturnCode.BattleNotEnough;//战力不足
                }
                else{
                    $code = $ao.ReqSubmit(user);
                    if($code == ReturnCode.Success){
                        $isCheck = $ao.Check(AllySetting.AS_Auto);
                        if($isCheck){ //自动批准
                            $code = $ao.ReqAllow($ao.GetLeader(), user['id']);//由于无需审核，因此以盟主名义签入该用户
                        }
                    }
                }

                if(!$ao){
                    return ReturnCode.AllyNotExist;//联盟不存在
                }
                break;
        }
        return {code:$code, data: $data};
    }

    GetRanks($user, $data, objData){
        let muster = facade.GetMapping(EntityType.Ally);

        $data.rank = 0;
        let $ao = muster.GetObject($user['id'], IndexType.Foreign);
        muster = muster.groupOf($user.id).orderby('BattleGrade', 'desc').paginate(5, objData.id, ['aid', 'Name', 'experience', 'BattleGrade']);
        
        $data.total = muster.pageNum;
        $data.page = muster.pageCur;

        let $idx = (muster.pageCur-1) * muster.pageSize;
        for(let $value of muster.records()){
            $idx++ ;

            $data.items[$idx] = {id: $value['aid'], name: $value['Name'], BattleGrade: $value['BattleGrade'], rank: $idx};
            if($value['aid'] == $user.aid){
                $data.rank = $idx;
            }
        }
    }
}

/**
 * 返回报文 Class D777001
 */
class D777001
{
    constructor(){
        /**
         * 排名
         * @var int
         */
        this.rank = 0;
        /**
         * 页数
         * @var int
         */
        this.total = 0;
        /**
         * 页码
         * @var int
         */
        this.page = 1;
        /**
         * 前50名用户排序，包含id, name, rank
         * @var array
         */
        this.items = {};
    }
}

exports = module.exports = P777001;
