let facade = require('../../../facade/Facade')
let {EntityType, NotifyType, ResType} = facade.const
let {EventData} = require('../../../facade/util/comm/EventData')

/**
 * 添加资源消息句柄
 * @param {EventData} event 
 */
function handle(event){ //用户资源发生变化
    switch(event.data.type){
        case NotifyType.slaveFlattery: //奴隶：谄媚
            this.notifyEvent('user.slave.flattery', {user:event.user, msg:event.data});
            break;
        case NotifyType.slaveCommend: //奴隶：表扬
            this.notifyEvent('user.slave.commend', {user:event.user, msg:event.data});
            break;
        case NotifyType.slaveEscaped://起义 - 必须参加一场战斗，战斗获胜方可获得自由
            this.notifyEvent('user.slave.escape', {user:event.user, msg:event.data});
            break;
        case NotifyType.slaveRansom://赎身 - 使用道具即可立即获得自由
            this.notifyEvent('user.slave.ransom', {user:event.user, msg:event.data});
            break;
        case NotifyType.slaveRelease://释放
            this.notifyEvent('user.slave.release', {user:event.user, msg:event.data});
            break;
        case NotifyType.slaveCatched: //抓捕结果
            this.notifyEvent('user.slave.catched', {user:event.user, msg:event.data});
            break;
        case NotifyType.slaveLash://鞭挞
            this.notifyEvent('user.slave.lash', {user:event.user, msg:event.data});
            break;
        case NotifyType.slaveFood://加餐
            this.notifyEvent('user.slave.food', {user:event.user, msg:event.data});
            break;
        case NotifyType.slaveAvenge://复仇
            this.notifyEvent('user.slave.avenge', {user:event.user, msg:event.data});
            break;
        case NotifyType.mail: //发送邮件
            facade.GetMapping(EntityType.Mail).Create(event.user, event.data.info.con, event.data.info.src, event.data.info.dst);
            break;
        case NotifyType.DailyActivityBonus://下发活动奖励
            facade.GetMapping(EntityType.Mail).Create(event.user, event.data, 'system', event.user.openid);//发邮件
            event.user.notify(event.data);//发通知
            break;
        case NotifyType.DailyActivityInstantBonus:
            event.user.getPocket().AddRes(702, -event.data.info.num); //扣取活动道具
            event.user.getBonus(event.data.info.bonus);
            event.user.notify(event.data);//发通知
            break;
            
        case NotifyType.socialSendAction:   //赠送体力
            event.user.notify(event.data);
            event.data.info.bonus = {type:ResType.Action, num:1};
            facade.GetMapping(EntityType.Mail).Create(event.user, event.data, "system", event.user.openid);
            break;
    
        case NotifyType.socialSendHello://点赞
            if(event.user.getTxFriendMgr().recvHello(event.data)){
                event.user.notify(event.data);
            }
            break;
    
        case NotifyType.userStatus: //好友状态发生变化
            //下发通知
            event.user.notify(event.data);
            break;
    
        default:
            event.user.notify(event.data);
            break;
    }
}

module.exports.handle = handle;
