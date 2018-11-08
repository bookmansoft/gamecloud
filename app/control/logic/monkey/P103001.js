let facade = require('../../../../facade/Facade')
let {RankType, EntityType, UserStatus, GuideList, NotifyType, ActionExecuteType, em_Condition_Type, OperEnum, ReturnCode} = facade.const
let UserEntity = require('../../../model/entity/UserEntity')

/**
 * 活动相关的操作
 */
const em_Activity_OperType = {
    checkGuide:0,           //查询新手引导
    queryWeeky:1,           //查询每周活动
    WeekyRank:2,           //查询每周活动
    getBonus:3,             //获取奖励
}

/**
 * 活动功能接口
 */
class P103001 extends facade.Control
{
    /**
     * @brief  报文编号 P103001
     *
     * @date   2018.1.27
     *
     * @param {UserEntity} user 
     * @param  :
     * 名称        | 类型     | 描述
     * ------------|----------|--------------------
     * oper        | int      | 操作类型
     * page        | int      | 请求的数据集页面编码
     * pageSize    | int      | 请求的数据集页面大小
     * idx         | int      | 请求的数据项编号
     *
     * @return
     * 名称        | 类型     | 描述
     * ------------|----------|----------------------
     * code        | int      | 返回码
     * data        | object   | 返回的数值对象
     *
     * @note
     */
    async Execute(user, input) {
        input.oper = parseInt(input.oper || 0);
        input.idx = parseInt(input.idx || 0);
        input.page = parseInt(input.page || 1);
        input.pageSize = parseInt(input.pageSize || 5);

        let $code = ReturnCode.Success;
        let $rankType = RankType.total;
        let dt = {};
        switch(input.oper){
            case em_Activity_OperType.queryWeeky:
            {
                return {code:ReturnCode.Success, data:this.parent.service.activity.getInfo(user)};
            }
            break;
            case em_Activity_OperType.WeekyRank:
            {
                return {code:ReturnCode.Success, data:this.parent.service.activity.rankList(user.id)};
            }
            break;
            case em_Activity_OperType.checkGuide:
            {
                return {code:ReturnCode.Success, data:GuideList[user.baseMgr.vip.GuideNo].next};
            }
            break;
            case em_Activity_OperType.getBonus:
            {
                return this.parent.service.activity.getBonus(user, parseInt(input.id || 0));
            }
            break;
        }
}
}

exports = module.exports = P103001;

