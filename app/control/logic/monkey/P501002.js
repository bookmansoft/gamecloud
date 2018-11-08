let facade = require('../../../../facade/Facade')
let {PurchaseType, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = require('../../../model/entity/UserEntity')
let PotentialClientItem = require('../../../../facade/util/potential/PetClientItem')

/**
 * 从未激活图腾中随机选取若干下行
 */
class P501002 extends facade.Control
{
    /**
     * @brief  报文编号 501002：可召唤图腾列表。召唤图腾可使用501001报文，对0级图腾执行升级操作
     *
     * @date   2016.10.12
     *
     * @param {UserEntity} user
     * @param  :
     * 名称        | 类型     | 描述
     * ------------|---------|--------------------
     * count       | int     | 希望获取的最大条数
     *
     * @return
     * 名称        | 类型     | 描述
     * ------------|----------|----------------------
     * code        | int      | 返回码
     * data        | object   | 返回的数值对象
     * .items      | array    | 可供操作的图腾列表
     *
     * @note
     */
    async Execute(user, input) {
        let $data = new D501002();
        let $code = ReturnCode.Success;
        let $control = user.getPotentialMgr();

        let $list = $control.GetRandomTotemList(input.count || 4);
        for(let $value of $list){
            let $item = new PotentialClientItem();
            $item.i = $value.id;
            $item.l = 0;
            $item.p = 0;
            $item.m = $value.getMoney();
            $data.items[$value.id] = $item;
        }

        return {code:$code, data: $data};
    }
}

/**
 * 返回报文 Class D501002
 */
class D501002
{
    constructor(){
        /**
         * 图腾列表
         * @var array
         */
        this.items = {};
    }
}

exports = module.exports = P501002;
