let facade = require('../../../../facade/Facade')
let {PurchaseType, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = require('../../../model/entity/UserEntity')
let PotentialClientItem = require('../../../../facade/util/potential/PetClientItem')

/**
 * 操作类型
 */
const em_Totem_OperType = {
    /**
     * 查询列表
     */
    query: 1,
    /**
     * 升级
     */
    upgrade: 2,
}

class P501001 extends facade.Control
{
    /**
     * @brief  报文编号 501001：图腾管理
     *
     * @date   2016.10.12
     *
     * @param {UserEntity} user
     * @param  :
     * 名称        | 类型     | 描述
     * ------------|----------|--------------------
     * oper        | int      | 操作类型 1查 2升级
     * id          | int      | 图腾编号
     * pm          | int      | 附加参数
     *
     * @return
     * 名称        | 类型     | 描述
     * ------------|----------|----------------------
     * code        | int      | 返回码
     * data        | object   | 返回的数值对象
     * .stone      | int      | 魂石数量
     * .items      | array    | 图腾列表
     * ..i         | int      | 编号
     * ..l         | int      | 等级
     *
     * @note
     * 召唤图腾，视为对0级图腾的升级操作
     */
    async Execute(user, input) {
        input.pm = input.pm || 1;
        input.id = input.id || 1;
        input.oper = input.oper || 1;

        input.pm = parseInt(input.pm);
        input.id = parseInt(input.id);
        input.oper = parseInt(input.oper);

        let $data = new D501001();
        let $code = ReturnCode.Success;
        let $control = user.getPotentialMgr();

        switch(input.oper){
            case em_Totem_OperType.query:
                break;

            case em_Totem_OperType.upgrade:
                $code = $control.UpgradeTotem(user, input.id, input.pm);
                break;
        }

        $control.CalcTotemCost();//计算升级费用

        let $list = $control.GetTotemList();
        for(let $key in $list){
            let $value = $list[$key];
            let $item = new PotentialClientItem();
            $item.i = $value.id;
            $item.l = $value.getLevel();
            $data.items[$value.id] = $item;
        }
        $data.stone = user.getPocket().GetRes(ResType.Stone);
        $data.stoneHero = user.getPocket().GetRes(ResType.StoneHero);
        $data.power = user.getPower();
        $data.powerClick = user.getClickPower();

        return {code:$code, data: $data};
    }
}

/**
 * 返回报文 Class D501001
 */
class D501001
{
    constructor(){
        /**
         * 法宝总战斗力
         * @var
         */
        this.power;
        this.powerClick;
        /**
         * 魂石数量
         * @var int
         */
        this.stone = 0;
        /**
         * 英魂数量
         * @var int
         */
        this.stoneHero = 0;
        /**
         * 图腾列表
         * @var array
         */
        this.items = {};
    }
}

exports = module.exports = P501001;
