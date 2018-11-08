let facade = require('../../../../facade/Facade')
let {EntityType, ActivityType, em_Condition_Type, em_Condition_Checkmode, ReturnCode, NotifyType, DomainType, UserStatus} = facade.const
let mails = facade.EntityList.mails

/**
 * Created by liub on 2017-08-4.
 * 
 * 奴隶抓捕事件处理句柄, 抓捕流程：
 *  1、客户端上行sendHello报文，服务端下行关卡和敌人信息
 *  2、客户端开始战斗并提交战斗结果，服务端判断是否满足抓捕条件，然后同时向抓捕者和被抓捕者推送消息（被抓捕者有可能跨服）
 *  3、被抓捕者收到消息，执行被抓捕操作，向自己下行消息。
 * 
 * *事件句柄中，this指向门面对象，也就是facadeBase，data.user指向事件的接收用户对象，data.msg为事件内容
 */
function handle(data) {
    let msg = data.msg;

    msg.info.time = facade.configration.DataConst.slave.catchTime;

    if(msg.info.src == data.user.openid){//抓捕者
        if(msg.info.code == ReturnCode.Success){
            msg.info.code = data.user.baseMgr.slave.addSlave(msg.info.dst);
            if(msg.info.code == ReturnCode.Success){        
                //任务检测
                //data.user.baseMgr.task.Execute(em_Condition_Type.totalSlaveCatch, 1, em_Condition_Checkmode.add);
                facade.current.notifyEvent('user.task', {use:data.user, data:{type:em_Condition_Type.totalSlaveCatch, value:1}});
                //累计分段积分
                this.service.activity.addScore(data.user.id, ActivityType.Slave, 1);
                let fri = data.user.getTxFriendMgr().getFriend(msg.info.dst);
                if(!!fri && !this.options.debug) {
                    let desc = data.user.router.config.slaveMsg["catched"].desc;
                    data.user.router.service.txApi.send_gamebar_msg(data.user,msg.info.dst,3,desc,"V1_AND_QZ_4.9.3_148_RDM_T");
                    data.user.router.control.chat.sendChat(data.user,{id:12,c:"1",src:data.user.name,dst:fri.name,system:1});//向奴隶主服务器发送系统公告
                }
            }
        }
        data.user.notify(msg);  //给抓捕者下行处理结果报文, 注意有可能是抓捕失败的消息
    }
    else if(msg.info.dst == data.user.openid){//被抓捕者
        if(msg.info.code == ReturnCode.Success){
            msg.info.code = data.user.baseMgr.slave.addMaster(msg.info.src);   //执行被抓捕操作
            if(msg.info.code == ReturnCode.Success){
                //写报告
                facade.GetMapping(EntityType.Mail).Create(data.user, msg, "system", data.user.openid);
                data.user.notify(msg); //给自己发消息
            }
        }
    }
}

module.exports.handle = handle;