let facade = require('../../../../facade/Facade')
let {PurchaseType, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = require('../../../model/entity/UserEntity')
let PotentialClientItem = require('../../../../facade/util/potential/PetClientItem')

/**
 * PVE伙伴操作类型码
 * @package App\Http\Packet\Input
 */
const em_CPet_OperType = {
    /**
     * 查询列表 列出所有PVE伙伴，包括激活、未激活
     */
    query: 1,
    /**
     * 升级 使用金币进行等级提升
     */
    upgrade: 2,
    /**
     * 切换上阵
     */
    switch: 3,
    /**
     * 对于等级为0的PVE伙伴，执行激活操作
     */
    activate: 4,
    /**
     * 进阶 使用碎片进阶
     */
    enhance: 5,
}

/**
 * PVE伙伴相关操作
 */
class P504001 extends facade.Control
{
    /**
     * @brief 504001报文：查询并获取PVE伙伴列表、激活PVE伙伴
     * @date   2016.10.16
     * @author bookman
     * 
     * @param {UserEntity} user
     * @param  :
     * name     | type     | description of param
     * ---------|----------|--------------------
     * oper     | int      | 操作码 1查询 2升级 
     * id       | int      | 指定的PVE伙伴编号，查询列表时可不填写
     * pm       | int      | 附加参数，升级时表示一次升多少级
     *
     * @return
     * name     | type     | description of value
     * -------- |----------|----------------------
     * code     | int      | 返回码
     * data     | int      | 返回数据对象
     * .items   | array    | PVE伙伴列表
     * ..i      | int      | 编号
     * ..l      | int      | 当前等级
     * ..p      | int      | 当前拥有的专属碎片数量 point
     * ..b      | int      | 当前战力 power
     *
     * @note 查询列表暂不考虑分页功能；目前无论是查询列表，还是升级强化进阶，都返回完整的列表，优化阶段将改为只返回受影响的项目列表
     */
    async Execute(user, input) {
        input.pm = input.pm || 1;
        input.id = input.id || 1;
        input.oper = input.oper || 1;
        
        input.pm = Math.max(1, parseInt(input.pm)); //最小1
        input.id = parseInt(input.id);
        input.oper = parseInt(input.oper);

        let $data = new D504001();
        let $code = ReturnCode.Success;
        let $control = user.getPotentialMgr();

        switch(input.oper){
            case em_CPet_OperType.query:
                break;

            case em_CPet_OperType.upgrade:
                $code = $control.UpgradeCPet(user, input.pm);
                break;

            case em_CPet_OperType.activate:
                $code = $control.ActiveCPet(input.id);
                break;
            
            case em_CPet_OperType.enhance:
                $code = $control.AdvanceCPet(user, input.id, input.pm);
                break;

            case em_CPet_OperType.switch:
                $code = $control.PerformCPet(user, input.id);
                break;
        }

        let $list = $control.GetCPetList();
        for(let $key in $list){
            let $value = $list[$key];

            //转化为和客户端适配的数据结构
            $data.items[$value.id] = $value.ToClient();
            //专属碎片数量
            $data.items[$value.id].p = user.getPocket().GetRes(ResType.FellowChipHead, $value.id);
        }
        $data.active = $control.cpetActiveId;
        $data.powerClick = user.getClickPower();

        return {code:$code, data: $data};
    }
}

/**
 * 返回报文 Class D504001
 */
class D504001
{
    constructor(){
        /**
         * 当前激活PVE伙伴
         * @var int
         */
        this.active = 0;
        /**
         * PVE伙伴列表
         * @var array
         */
        this.items = {};
        /**
         * PVE伙伴攻击力
         * @var
         */
        this.powerClick;
    }
}

exports = module.exports = P504001;
