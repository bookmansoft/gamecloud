let facade = require('../../../../facade/Facade')
let {UserStatus, PurchaseType, ResType, ActionExecuteType, ReturnCode,GuideList} = facade.const
let UserEntity = facade.UserEntity
let LargeNumberCalculator = require('../../../../facade/util/comm/LargeNumberCalculator')

/**
 * Class P999002 获取用户常用状态，包括金币、元宝、魂石、状态
 */
class P999002 extends facade.Control
{
    /**
     * @brief  999002报文：获取用户常用状态
     *
     * @date   2016.10.12
     *
     * @param {UserEntity} user
     * @param  :
     * name        | type     | description of param
     * ------------|----------|--------------------
     * null        | null     | null
     *
     * @return
     * name        | type     | description of value
     * ------------|----------|----------------------
     * code        | int      | 返回码
     * data        | object   | 返回的数值对象
     * .status     | int      | 复合状态位 详见UserStatus说明
     * .diamond    | int      | 元宝数量
     * .money      | {b,p}    | 金币数量
     * .power      | {b,p}    | 当前攻击力
     * .powerClick | {b,p}    | 当前点击攻击力
     * .stone      | int      | 魂石数量
     * .stoneHero  | int      | 英魂数量
     * .action     | int      | 体力
     * .totem      | int      | 圣光
     * .effects    | array    | 特效列表
     * ..type      | int      | 特效类型
     * ..value     | float    | 特效数值
     * ..expired   | int      | 有效期，为0表示永久有效，否则和当前时间比对
     */
    async Execute(user, objData) {
        let $data = new D999002();
        let $code = ReturnCode.Success;
        let $status = facade.Indicator.inst(user['status']);
        let $tm = user.getTaskMgr();
        if($tm.FinishedTask() > 0){
            $status.set(UserStatus.task);
        }
        else{
            $status.unSet(UserStatus.task);
        }
        $data.status = $status.value;
        $data.diamond = user.getPocket().GetRes(ResType.Diamond);
        $data.money = user.getPocket().GetRes(ResType.Gold);
        $data.offline = user.getTollgateMgr().getMoneyOffline();
        $data.power = user.getPower();
        $data.powerClick = user.getClickPower();
        $data.action = user.getPocket().GetRes(ResType.Action);
        $data.stone = user.getPocket().GetRes(ResType.Stone);
        $data.stoneHero = user.getPocket().GetRes(ResType.StoneHero);
        $data.totem = user.getPocket().GetRes(ResType.Potential);
        $data.effects = user.effect().effectList;
        $data.newGuide = GuideList[user.baseMgr.vip.GuideNo].next;        
        return {code:$code, data: $data};
    }
}

/**
 * 返回报文 Class D999002
 */
class D999002
{
    constructor(){
        this.money;
        this.diamond;
        this.power;
        this.powerClick;
        this.offline;
        this.stone;
        this.stoneHero;
        this.status;
        this.action;
        this.totem;
        this.effects;
        this.newGuide;
    }
}

exports = module.exports = P999002;
