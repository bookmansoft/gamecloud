let facade = require('../../../facade/Facade')
let {NotifyType, ResType,ActivityType,em_Condition_Type,em_Condition_Checkmode} = facade.const
let {EventData} = require('../../../facade/util/comm/EventData')

/**
 * 使用了特殊道具卡
 * @param {EventData} event 
 */
function handle(event){ 
    //region 任务检测 复活咖啡豆
    switch(id){
        case 22:
            event.user.getBonus({type:ResType.Action, num:event.data.value});
            break;
        case 23:
            //如果体力满了就不要添加了
            if(!event.user.getPocket().isMaxRes(ResType.Action)){ 
                event.user.getBonus({type:ResType.Action, num:event.user.getPocket().GetResMaxValue(ResType.Action)});
            }
            break;
        case 20:
            this.notifyEvent('user.task', {user:event.user, data:{type:facade.const.em_Condition_Type.totalRevive, value:event.data.value}});

            //累计分段积分
            this.service.activity.addScore(event.user.id, ActivityType.Revive, 1);
            break;
    }
    //endregion
}

module.exports.handle = handle;
