/**
 * Created by admin on 2017-07-20.
 */
let facade = require('../../../../facade/Facade')
let {NotifyType} = facade.const;

/**
 * 活动中的分段积分奖励激活事件
 * @param {*} data 
 */
function handle(data) {
    //下行奖励通知
    data.user.notify({
        type: NotifyType.activityRankBonus, 
        info: {
            bonus: facade.configration.activity.ActivityRankBonus[this.service.activity.type][data.rank].bonus, 
            rank: data.rank, 
            status: 0
        }
    });
}

module.exports.handle = handle;
