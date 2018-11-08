let facade = require('../../../facade/Facade')
let {NotifyType, ResType, ActivityType,em_Condition_Type,em_Condition_Checkmode} = facade.const
let {EventData} = require('../../../facade/util/comm/EventData')
let {LargeNumberCalculator} = require('../../../facade/util/comm/LargeNumberCalculator')

/**
 * 添加资源消息句柄
 * @param {EventData} event 
 */
function handle(event){ //用户资源发生变化
    switch(event.data.type){ //后续处理
        case ResType.Coin:
            //任务检测
            facade.current.notifyEvent('user.task', {user:event.user, data:{type:em_Condition_Type.totalSpendMoney, value:event.data.value}})
            //累计分段积分
            facade.current.service.activity.addScore(event.user.id, ActivityType.Money, event.data.value);
            break;

        case ResType.Gold:
            //任务检测
            let coin = LargeNumberCalculator.Load(event.user.getPocket().GetRes(ResType.Gold));
            //只统计指数
            facade.current.notifyEvent('user.task', {user:event.user, data:{type:em_Condition_Type.totalMoney, value:coin.power, mode:em_Condition_Checkmode.absolute}});
            
            if(event.data.value.base < 0) {
                facade.current.service.activity.addScore(event.user.id, ActivityType.Money, event.data.value.power);
            }
            break;

        case ResType.Diamond:
            if(event.data.value < 0){ //消费了钻石
                //任务检测
                facade.current.notifyEvent('user.task', {user:event.user, data:{type:em_Condition_Type.totalSpendDiamond, value:-event.data.value}});
                //累计分段积分
                facade.current.service.activity.addScore(event.user.id, ActivityType.Diamond, -event.data.value);
            }

            //将当前钻石数量同步到单独的字段上以便于统计分析
            event.user.diamond = event.user.getPocket().GetRes(ResType.Diamond);
            
            break;

        case ResType.Action:
            event.user.baseMgr.item.AutoAddAP(); //检测体力自动恢复
            if(event.data.value < 0){
                //任务检测
                facade.current.notifyEvent('user.task', {user:event.user, data:{type:em_Condition_Type.useAction, value:-event.data.value}});
                //累计分段积分
                facade.current.service.activity.addScore(event.user.id, ActivityType.Action, -event.data.value);
            }
            break;

        case ResType.Stone:
            if(event.data.value > 0){
                facade.current.notifyEvent('user.task', {user:event.user, data:{type:em_Condition_Type.getStone, value:event.data.value}});
            }
            break;

        case ResType.Road:
            event.user.getTaskMgr().Execute(em_Condition_Type.totalRoad, 1);
            event.user.getTaskMgr().Execute(em_Condition_Type.getRoad, event.data.id, em_Condition_Checkmode.absolute);
            break;
        case ResType.Role:
            event.user.getTaskMgr().Execute(em_Condition_Type.totalRole, 1);
            event.user.getTaskMgr().Execute(em_Condition_Type.getRole, event.data.id, em_Condition_Checkmode.absolute);
            break;
        case ResType.Scene:
            event.user.getTaskMgr().Execute(em_Condition_Type.totalScene, 1);
            event.user.getTaskMgr().Execute(em_Condition_Type.getScene, event.data.id, em_Condition_Checkmode.absolute);
            break;
    }

    event.user.notify({type: NotifyType.action, info: event.user.getPocket().getActionData()});
}

module.exports.handle = handle;
