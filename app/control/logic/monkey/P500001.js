let facade = require('../../../../facade/Facade')
let {PurchaseType, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = require('../../../model/entity/UserEntity')

/**
 * 操作类型
 * Class e_Equ_OperType
 * @package App\Http\Packet\Input
 */
const em_Equ_OperType = {
    /**
     * 查询列表
     */
    query: 1,
    /**
     * 升级
     */
    upgrade: 2,
    /**
     * 洗点
     */
    changePoint: 3,
    /**
     * 分配闲置的圣光点
     */
    assign: 4,
}

/**
 * 查询并获取法宝列表、激活法宝、升级法宝
 */
class P500001 extends facade.Control
{
    /**
     * @brief 500001报文：查询并获取法宝列表、激活法宝、升级法宝
     * @date   2016.10.16
     * @author bookman
     * @param {UserEntity} user
     * @param  :
     * name     | type     | description of param
     * ---------|----------|--------------------
     * oper     | int      | 操作码 1查询 2升级（可分为激活、升1级、升多级） 3洗点 4分配
     * id       | int      | 指定的法宝编号，查询列表时可不填写
     * pm       | int      | 附加参数，升级时表示一次升多少级；洗点时表示一次洗多少点；分配时表示一次分配多少点
     *
     * @return
     * name     | type     | description of value
     * -------- |----------|----------------------
     * code     | int      | 返回码
     * data     | int      | 返回数据对象
     * .power   | LN       | 法宝总战斗力
     * .money   | LN       | 当前总金币
     * .totem   | int      | 当前圣光点数
     * .reAssign| array    | 圣光重分配中，新分配到点数的圣光列表：圣光编号 新分配点数
     * .items   | array    | 法宝列表 受影响的项目列表 目前直接下行全部项目列表，后期优化
     * ..i      | int      | 法宝编号
     * ..l      | int      | 法宝当前等级
     * ..p      | int      | 法宝当前加点
     * ..b      | int      | 当前战力
     * ..m      | int      | 升级所需金币
     *
     * @note 查询列表暂不考虑分页功能；目前无论是查询列表，还是升级洗点，都返回完整的法宝列表，优化阶段将改为只返回受影响的法宝列表
     */
    async Execute(user, input) {
        let $data = new D500001();
        
        input.pm = parseInt(input.pm);
        input.id = parseInt(input.id);
        input.oper = parseInt(input.oper);

        let $code = ReturnCode.Success;

        let $control = user.getPotentialMgr();

        switch(input.oper){
            case em_Equ_OperType.query:
                break;

            case em_Equ_OperType.changePoint: //重新分配圣光，input.id指定法宝，input.pm指定要重新分配的点数
                input.pm = Math.min(input.pm, $control.getPoint(input.id));
                if(input.pm <= 0){
                    $code = ReturnCode.paramError;
                    break;
                }

                let curPm = input.pm;   //用于管理执行次数的中间控制变量

                //分配圣光有次数限制，每天有一定免费次数，另外还可以消耗执行道具
                let $freePoint = user.getActionMgr().GetExecuteNum(ActionExecuteType.AE_Totem_Assign);//免费执行的次数
                let $assignPoint = user.getPocket().GetRes(ResType.AssignPotential); //执行道具的数量

                if(($freePoint + $assignPoint) < curPm){//执行力不足，需要元宝支付
                    if(!user.purchase(PurchaseType.totemAssign, curPm - ($freePoint + $assignPoint), true)) {//元宝不足，退出执行
                        $code = ReturnCode.NotEnough_Diamond;
                        break; 
                    }
                    curPm = $freePoint + $assignPoint; //元宝支付了一部分执行力，剩余部分仍旧记录在curPm上
                }

                //先从免费次数中扣除一部分
                $freePoint = Math.min($freePoint, curPm);
                user.getActionMgr().Execute(ActionExecuteType.AE_Totem_Assign, $freePoint, true);

                if($freePoint < curPm){
                    //剩余部分从执行道具上扣除，由于先前元宝支付检测环节的保证，此处执行道具的数量是足够的
                    user.getPocket().AddRes(ResType.AssignPotential, -(curPm - $freePoint));
                }

                //分配圣光
                $data.reAssign = $control.ReAssignPoint(user, input.id, input.pm);
                break;

            case em_Equ_OperType.upgrade:
                $code = $control.UpgradeTech(user, input.id, input.pm);
                break;

            case em_Equ_OperType.assign:
                $data.reAssign = $control.AssignPoint(user, input.pm);
                break;
        }

        for(let $key in $control.GetList()){
            let $value = $control.GetList()[$key];
            $data.items[$value.id] = $value.ToClient(input.pm);
        }
        $data.power = user.getPower();
        $data.powerClick = user.getClickPower();
        $data.money = user.getPocket().GetRes(ResType.Gold);
        $data.totem = user.getPocket().GetRes(ResType.Potential);
        $data.freePoint = user.getActionMgr().GetExecuteNum(ActionExecuteType.AE_Totem_Assign);//免费执行的次数

        return {code:$code, data: $data};
    }
}

/**
 * 返回报文 Class D500001
 */
class D500001
{
    constructor(){
        /**
         * 法宝总战斗力
         * @var
         */
        this.power;
        this.powerClick;
        /**
         * 金币
         * @var
         */
        this.money;
        /**
         * 当前免费的洗点次数
         * @var
         */
        this.freePoint;
        /**
         * 可自由分配的圣光数量
         * @var
         */
        this.totem;
        /**
         * 受影响的项目列表 目前直接下行全部项目列表，后期优化
         * @var
         */
        this.items = {};
        /**
         * 圣光重新分配列表
         * @var array
         */
        this.reAssign = {};
    }
}

exports = module.exports = P500001;
