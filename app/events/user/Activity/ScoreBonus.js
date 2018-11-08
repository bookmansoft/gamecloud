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
    if(!!facade.configration.activity.ActivityScoreBonus[this.service.activity.type] && !!facade.configration.activity.ActivityScoreBonus[this.service.activity.type][data.lv]){
        //下行奖励通知
        data.user.notify({
            type: NotifyType.activityScoreBonus,
            info: {
                bonus: facade.configration.activity.ActivityScoreBonus[this.service.activity.type][data.lv].bonus, 
                LV: data.lv, 
                score: data.score,
                status: 0
            }
        });
    }
}

module.exports.handle = handle;
