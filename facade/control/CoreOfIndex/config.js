let facade = require('../../Facade')
let {ReturnCode, UserStatus, em_Condition_Type, em_Condition_Checkmode, NotifyType, ActivityType, RankType, em_EffectCalcType,em_Effect_Comm,mapOfTechCalcType} = facade.const

/**
 * 配置管理器
 * Updated by liub on 2017-05-05.
 */
class config extends facade.Control {
    get router() {
        return [
            [`/config`, 'getfile'], //通过标准 GET 方法获取配置文件
        ];
    }

    async getfile(objData) {
        return this.get(null, objData);
    }

    /**
     * 查询并返回配置文件
     * @param user
     * @param objData
     * @returns {Promise.<*>}
     */
    async get(user, objData) {
        try{
            if(!!this.core.fileMap[objData.file]){
                return {code:ReturnCode.Success, data: this.core.fileMap[objData.file]};
            }
            else{
                return {code:ReturnCode.Error};
            }
        }
        catch(e){
            console.error(e);
        }
    }

    /**
     * 获取服务器列表
     * @param user
     * @param objData
     * @returns {{code: number, data: *}}
     */
    getServerList(user, objData){
        return {
            code:ReturnCode.Success,
            data:this.core.service.servers.forServers(srv=>{
                return `${srv.stype}.${srv.sid}`;
            }),
        };
    }

    /**
     * 为客户端分配远程访问地址和端口
     * @param pUser
     * @param info
     * @returns {{ret: boolean, data: {ip: *, port}}}
     */
    async getServerInfo(pUser, info){
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

exports = module.exports = config;
