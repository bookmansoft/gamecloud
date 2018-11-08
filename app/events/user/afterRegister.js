let facade = require('../../../facade/Facade')
let {RecordType, ResType, DomainType} = facade.const

/**
 * 用户注册事件处理句柄
 * Created by admin on 2017-05-26.
 */
function handle(data) {
    //console.log(`${data.user.openid}在${this.options.serverType}.${this.options.serverId}上创建游戏角色`);

    //region 必要的数据初始化工作
    data.user.getBonus({type: ResType.Role, id:1001, num:1});
    data.user.getBonus({type: ResType.Scene, id:18, num:1});
    data.user.getBonus({type: ResType.Road, id:3001, num:1});

    data.user.getInfoMgr().SetRecord(RecordType.Role, 1001);     //默认角色
    data.user.getInfoMgr().SetRecord(RecordType.Scene, 18);      //默认场景
    data.user.getInfoMgr().SetRecord(RecordType.Road, 3001);     //默认道路
    //endregion

    if(!this.options.debug){
        switch(data.user.domainType) {
            case DomainType.TX: //腾讯平台数据上报接口
                this.service.txApi.Report_Regaccount(data.user.openid).then(apiRet=>{
                    if(apiRet.ret != 0){
                        console.log(`Report_Regaccount Error: ${JSON.stringify(aipRet)}`);
                    }
                }).catch(e=>{});
                this.service.txApi.Report_Regchar(data.user.openid).then(apiRet=>{
                    if(apiRet.ret != 0){
                        console.log(`Report_Regchar Error: ${JSON.stringify(aipRet)}`);
                    }
                }).catch(e=>{});
                break;
        }
    }
}

module.exports.handle = handle;
