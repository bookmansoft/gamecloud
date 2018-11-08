let facade = require('../../../facade/Facade')
let {DomainType, UserStatus} = facade.const
let {now, ms} = facade.util

/**
 * Created by admin on 2017-05-26.
 */
function handle(data) {//用户签退
    // console.log(`${data.user.openid}退出游戏, 持续${now() - data.user.loginTime}秒`,this.options.debug);
    switch(data.user.domainType) {
        case DomainType.TX:
            //在线状态发生变化
            data.user.baseMgr.info.UnsetStatus(UserStatus.online);

            if(!this.options.debug){
                let onlinetime = now() - data.user.loginTime;
                this.service.txApi.Report_Logout(data.user.openid, onlinetime).then(apiRet=>{
                    if(apiRet.ret != 0){
                        console.log(`Report_Logout Error: ${JSON.stringify(aipRet)}`);
                    }
                }).catch(e=>{});
            }
            break;

        case DomainType.SYSTEM:
            this.service.servers.mapServer(data.user, true); //清理先前注册的逻辑服信息
            break;
        
        default:
            break;
    }
}

module.exports.handle = handle;
