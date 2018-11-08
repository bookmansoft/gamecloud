/**
 * Created by liub on 2017-08-4.
 * 
 * 奴隶释放事件处理句柄
 */
let facade = require('../../../../facade/Facade')
let {EntityType, ActivityType, em_Condition_Type, em_Condition_Checkmode, ReturnCode, NotifyType, DomainType, UserStatus} = facade.const

function handle(data) {
    let $now = facade.util.now();
    let msg = data.msg;

    if(msg.info.src == data.user.openid) { //我释放了奴隶，两种情况（1、因被抓捕而被动释放奴隶；2、主动释放
        [msg.info.code, msg.info.time] = data.user.baseMgr.slave.removeSlave(msg.info.dst);
    }
    else if(msg.info.dst == data.user.openid){//我作为奴隶被释放,两种情况（1、期满释放；2、提前释放
        [msg.info.code, msg.info.time] = data.user.baseMgr.slave.removeMaster(msg.info.src);

        if(msg.info.code == ReturnCode.Success){
            if($now >= msg.info.time){ //期满释放
                msg.info.early = 0;
            }
            else {//提前释放
                msg.info.early = 1;       
            }
            facade.GetMapping(EntityType.Mail).Create(data.user, msg, "system", data.user.openid);//期满释放
        }
    }
    msg.info.time = 0;
    data.user.notify(msg);
}

module.exports.handle = handle;