let facade = require('../../../../facade/Facade')
let {EntityType, ActivityType, em_Condition_Type, em_Condition_Checkmode, ReturnCode, NotifyType, DomainType, UserStatus} = facade.const

/**
 * Created by liub on 2017-08-4.
 * 
 * 表扬奴隶事件处理句柄
 * 
 * *事件句柄中，this指向门面对象，也就是facadeBase，data.user指向事件的接收用户对象，data.msg为事件内容
 */
function handle(data) {
    let msg = data.msg;
    if(msg.info.src == data.user.openid){//奴隶主
        data.user.notify(msg);
    }
    else if(msg.info.dst == data.user.openid) {//奴隶
        if(!!msg.info.bonus){ //避免本应该发给奴隶主的奖励，发到了奴隶的邮箱
            delete msg.info.bonus;
        }
        facade.GetMapping(EntityType.Mail).Create(data.user, msg, "system", data.user.openid);
    }
}

module.exports.handle = handle;