let facade = require('../../../../facade/Facade')
let {EntityType, ReturnCode} = facade.const

/**
 * Created by liub on 2017-08-4.
 * 
 * 给奴隶加餐事件处理句柄
 * 
 * *事件句柄中，this指向门面对象，也就是facadeBase，data.user指向事件的接收用户对象，data.msg为事件内容
 */
function handle(data) {
    let msg = data.msg;
    if(msg.info.src == data.user.openid){//奴隶主
        data.user.notify(msg);
    }
    else if(msg.info.dst == data.user.openid) {//奴隶
        if(!!msg.info.bonus){
            delete msg.info.bonus;
        }
        facade.GetMapping(EntityType.Mail).Create(data.user, msg, "system", data.user.openid);
    }
}

module.exports.handle = handle;
