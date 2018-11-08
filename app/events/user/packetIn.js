let facade = require('../../../facade/Facade')
let time5 = new facade.updateMgr(5000);
let {EventData} = require('../../../facade/util/comm/EventData')

/**
 * Created by admin on 2017-05-26.
 * @param {EventData} data
 */
function handle(data) { //客户端上行消息
    data.user.baseMgr.vip.checkActivityStatus();//检测并修复排名活动的相关信息
    //获取并下发世界聊天消息
    this.service.chat.Query(data.user);
    //获取并下发私聊消息
    data.user.privateChatMgr.Query();
    //定期检测待处理事务
    data.user.tick();
    if (time5.check()) {
        //判断是否开启七夕活动
        this.remoteCall('dailyactivity.CheckButtonStatus', [data.user.domain, data.user.openid], msg=>{return msg});     
    }
}

module.exports.handle = handle;
