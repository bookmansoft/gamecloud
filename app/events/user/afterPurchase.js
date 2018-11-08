let facade = require('../../../facade/Facade')
let {DomainType} = facade.const;

/**
 * Created by admin on 2017-05-26.
 */
function handle(data) {//用户注册时，必要的初始化工作
    //console.log(`${data.user.openid}花费了${data.amount}`);
    if(!this.options.debug){
        switch(data.user.domainType) {
            case DomainType.TX:
                let paytype=3;//{paytype} :  0 : Q币  1:金卷  2:秀币 3:星币
                let amt = data.amount / 10;
                this.service.txApi.Report_Pay(data.user.openid,amt,paytype).then(apiRet=>{
                    if(apiRet.ret != 0){
                        console.log(`Report_Regaccount Error: ${JSON.stringify(aipRet)}`);
                    }
                }).catch(e=>{});
                break;
        }
    }
}

module.exports.handle = handle;