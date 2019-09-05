let facade = require('../../../Facade')
let {ReturnCode, UserStatus} = facade.const

/**
 * 配置管理器
 * Updated by liub on 2017-05-05.
 */
class lb extends facade.Control {
    /**
     * 为客户端分配远程访问地址和端口
     * @param pUser
     * @param info
     * @returns {{ret: boolean, data: {ip: *, port}}}
     */
    async getServerInfo(pUser, info) {
        try{
            //优先路由:强制切换到Test域
            if(this.core.testRoute.has(info.oemInfo.openid)) {
                facade.CoreOfLogic.mapping.map(lt => {
                    let regx = new RegExp(lt, 'g');
                    info.oemInfo.domain = info.oemInfo.domain.replace(regx, "Test");
                });
            }

            //判断是否已注册
            let ui = await this.core.getUserIndex(info.oemInfo.domain, info.oemInfo.openid, true);
            if(!!ui) {
                //向目标逻辑服发送预登录信息
                let ret = await this.core.remoteCall("userPreLogin", info.oemInfo, msg=>{return msg}, ui);
                if(!!ret && ret.code == ReturnCode.Success) {
                    return {
                        code: ReturnCode.Success,
                        //注意：返回的是服务器的mapping地址
                        data: {
                            newbie: facade.tools.Indicator.inst(ui.status).check(UserStatus.isNewbie), 
                            ip: this.core.serversInfo[ui.stype][ui.sid].webserver.mapping, 
                            port:this.core.serversInfo[ui.stype][ui.sid].webserver.port
                        }
                    };
                } else {
                    return ret;
                }
            }
        }
        catch(e){
            console.error(e);
        }
        return {code: ReturnCode.Error};
    }
}

exports = module.exports = lb;
