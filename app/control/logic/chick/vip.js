let facade = require('../../../../facade/Facade')
let {ActionExecuteType, ReturnCode} = facade.const

/**
 * VIP相关流程
 * Updated by liub on 2017-07-03.
 */
class vip extends facade.Control
{
    /**
     * 领取每日奖励，分为VIP奖励和普通奖励
     * @param {*} user 
     * @param {*} objData 
     */
    async draw(user, objData) {
        return user.baseMgr.vip.draw();
    }

    async drawDaily(user, objData){
        return user.baseMgr.vip.drawDaily();
    }

    async drawFirstPurchaseBonus(user, objData){
        return user.baseMgr.vip.drawFirstPurchaseBonus();
    }

    /**
     * 检测VIP有效期
     * @param {*} user 
     * @param {*} objData 
     */
    async checkValid(user, objData){
        return {code: ReturnCode.Success, data:{valid:user.baseMgr.vip.valid, time:user.baseMgr.vip.time, effect:user.baseMgr.vip.getEffect()}};
    }
}

exports = module.exports = vip;