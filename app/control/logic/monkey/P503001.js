let facade = require('../../../../facade/Facade')
let {PurchaseType, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = require('../../../model/entity/UserEntity')
let PotentialClientItem = require('../../../../facade/util/potential/PetClientItem')

/**
 * 时效性技能操作类型
 */
const em_ActionOper = {
    /**
     * 查询
     */
    query: 1,
    /**
     * 施放
     */
    action: 2,
    /**
     * 消除CD
     */
    clear: 3,
}

/**
 * 时效性技能管理
 */
class P503001 extends facade.Control
{
    /**
     * @brief  报文编号 503001：时效性技能管理，查询列表，使用技能，消除CD
     *
     * @date   2016.10.12
     *
     * @param {UserEntity} user
     * 
     * @param  :
     * 名称        | 类型     | 描述
     * ------------|----------|--------------------
     * oper        | int      | 操作类型 1 查询列表 2 施放指定技能 3 消除技能CD
     * aid         | int      | 请求使用的技能编号
     *
     * @return
     * 名称        | 类型     | 描述
     * ------------|----------|----------------------
     * code        | int      | 返回码
     * data        | object   | 返回的数值对象
     * .items      | int      | 时效性技能列表
     * ..id        | int      | 技能编号
     * ..num       | int      | 对类型1技能（按次数使用）：可使用次数
     * ..status    | int      | 技能状态 1 正常 2 生效中 3 冷却中
     * ..cd        | int      | 对类型2技能（按CD使用）：剩余生效时间 或者 剩余冷却时间（秒）
     *
     * @note
     */
    async Execute(user, input) {
        let $data = new D503001();
        let $code = ReturnCode.Success;

        //region 整理参数
        input.oper = parseInt(input.oper);
        //endregion

        switch(input.oper) {
            case em_ActionOper.action:
                $code = user.getPotentialMgr().Action(input.aid);
                break;

            case em_ActionOper.clear:
                $code = user.getPotentialMgr().ActionClearCd(user);
                break;
        }

        $data.items = user.getPotentialMgr().Actions(user);
        $data.effects = user.effect().effectList;

        return {code:$code, data: $data};
    }
}

/**
 * 时效性技能管理报文下行包
 */
class D503001
{
    constructor(){
        /**
         * 技能列表
         * @var array
         */
        this.items = {};
        /**
         * 效果列表
         */
        this.effects = {};
    }
}

exports = module.exports = P503001;
