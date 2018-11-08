let facade = require('../../../../facade/Facade')
let {EntityType, ActivityType, em_Condition_Type, em_Condition_Checkmode, ReturnCode, NotifyType, DomainType, UserStatus} = facade.const

/**
 * Created by liub on 2017-08-4.
 * 
 * 奴隶谄媚事件处理句柄
 * 
 * *事件句柄中，this指向门面对象，也就是facadeBase，data.user指向事件的接收用户对象，data.msg为事件内容
 */
function handle(data) {
    let msg = data.msg;

    data.user.notify(msg);
    if(msg.info.src == data.user.openid){//奴隶主
        //发送一封邮件
        facade.GetMapping(EntityType.Mail).Create(data.user, msg, "system", data.user.openid);
    }
    else if(msg.info.dst == data.user.openid) {//奴隶
        data.user.notify({
            type: NotifyType.slaveFlatteryAdditional, 
            info:{
                code: msg.info.code,
                src: msg.info.src,
                dst: msg.info.dst,
                time: msg.info.time,
            }
        });
    }
}

module.exports.handle = handle;