/**
 * Created by liub on 2017-05-26.
 */
let facade = require('../../../facade/Facade')
let {NotifyType, ActionExecuteType, DomainType, UserStatus,em_Condition_Type} = facade.const

/**
 * 用户登录后，用来执行一些后续操作，例如获取腾讯会员信息、蓝钻特权等
 * @note 事件处理函数，this由外部注入，指向Facade
 * @param data
 */
function handle(data){
    data.user.loginTime = facade.util.now(); //记录登录时间
    //console.log(`${data.user.openid}进入游戏`);

    data.curTime = new Date();//记录当前时间，为后续流程提供统一的时间标尺
    let oem = data.objData.oemInfo;
    switch(data.user.domainType){
        case DomainType.TX: { //腾讯大厅 如果是腾讯的用户才做这个
            if(this.options.debug){
                break;
            }
            this.service.txApi.Report_Login(data.user.openid).then(apiRet=>{
                if(apiRet.ret != 0){
                    console.log(`Report_Login Error: ${JSON.stringify(aipRet)}`);
                }
            }).catch(e=>{});
            data.user.SetOpenKey(oem.openkey);
            data.user.SetPf(oem.pf);
            break;
        }
    }
    let d1 = data.curTime.toDateString();
    let d2 = data.user.getRefreshDate(); //缓存用户最近登录日期, 因为checkDailyData会修改该数值，而该数值后续判断还需要使用
    //todo:判断是否开启七夕活动
    this.remoteCall('dailyactivity.CheckButtonStatus',[data.user.domain, data.user.openid], msg=>{return msg});

    //如果跨天推送一条消息
    if(d1 != d2){
        data.user.notify({type:NotifyType.DailyEvent});
    }

    //赠送重生次数
    if(data.user.getActionMgr().Execute(ActionExecuteType.AE_Revival, 1, true)){
        data.user.getTollgateMgr().addRevivalLeftNum();
    }

    //检测用户跨天数据
    data.user.checkDailyData(d1);

    //记录用户登录行为
    if(data.user.getActionMgr().Execute(ActionExecuteType.AE_Login, 1, true)){
        //记录累计登录
        facade.current.notifyEvent('user.task', {user:data.user, data:{type:em_Condition_Type.totalLogin, value:1}});
        if(Date.parse(data.curTime)/1000 - Date.parse(d2)/1000 < 3600*48){
            //记录连续登录
            facade.current.notifyEvent('user.task', {user:data.user, data:{type:em_Condition_Type.loginContinue, value:1}});
        }
    }

    try{
        data.user.baseMgr.info.SetStatus(UserStatus.online, false);

        //刷新资源、体力值
        data.user.baseMgr.vip.checkActivityStatus();//检测并修复排名活动的相关信息
        data.user.baseMgr.item.AutoAddAP();//	刷新体力

        data.user.notify({type: NotifyType.actions, info: data.user.getActionMgr().getInfo()});
    }
    catch(e){
        console.error(e);
    }
}

module.exports.handle = handle;