let CoreOfBase = require('../core/CoreOfBase/core')
/**
 * Created by liub on 2017-03-26.
 */
class baseCtl
{
    /**
     * 构造函数
     * @param {CoreOfBase} core 
     */
    constructor(core)
    {
        this.core = core;
    }

    /**
     * 远程终端调用入口
     * @param {UserEntity} pUser 
     * @param {*} info 
     */
    async command(pUser, info) {
        if(typeof info.data == "string"){
            info.data = JSON.parse(info.data);
        }
        if(typeof info.data == 'object' && info.data.length >= 1){
            let func = info.data.splice(0,1)[0];
            if(!!this[func]){
                if(this.core.options.serverType == "Index"){ 
                    //Index首先收到了远程命令
                    let result = {};
                    if(info.data.length >= 2){ 
                        //如果指定了服务器，就只在该服务器上执行指令
                        let si = info.data.splice(0,2);
                        if(si[0] == "Index"){
                            result[`${si[0]}.${si[1]}`] = this[func](info.data);
                        } else {
                            info.data.unshift(func);
                            if(!!si[1]) {
                                for(let sid of Object.keys(this.core.serversInfo[si[0]])) {
                                    result[`${si[0]}.${sid}`] = await this.core.remoteCall('rpc', info.data, msg=>{return msg}, {stype:si[0], sid:sid});
                                }
                            } else {
                                result[`${si[0]}.${si[1]}`] = await this.core.remoteCall('rpc', info.data, msg=>{return msg}, {stype:si[0], sid:si[1]});
                            }
                        }
                    } else { 
                        //否则，首先在所有逻辑服务器上执行指令，然后在Index上执行指令
                        info.data.unshift(func);
                        for(let stype of Object.keys(this.core.serversInfo)) {
                            if(stype != "Index") {
                                for(let sid of Object.keys(this.core.serversInfo[stype])) {
                                    result[`${stype}.${sid}`] = await this.core.remoteCall('rpc', info.data, msg=>{return msg}, {stype:stype, sid:sid});
                                }
                            }
                        }
                        result['Index'] = this[func](info.data);
                    }
                    return result;
                } else {
                    //逻辑服收到了转发的远程命令
                    return this[func](info.data);
                }
            }
        }
    }

    /**
     * 由Index中转的控制台命令
     * @param {*} svr 
     * @param {*} obj 
     */
    rpc(svr, obj) {
        return this.core.control.Console["command"](null, {data: obj.msg});
    }

    /**
     * 路由的社交消息
     * @param obj
     * @returns {number}
     */
    async userNotify(obj){
        /**
         * @type {UserEntity}
         */
        let ui = this.core.GetObject(EntityType.User, `${obj.domain}.${obj.openid}`, IndexType.Domain);
        if(!!ui){
            ui.socialNotify(obj.msg);
        }
        return {code: ReturnCode.Success};
    }

    /**
     * 索引服通知预注册
     * @param svr
     * @param obj
     */
    userPreLogin(svr, obj) {
        return this.core.entities.UserEntity.preLogin(obj.msg);
    }

    echo() {
        return {code: 0, data: 'Hello World'};
    }
}

exports = module.exports = baseCtl;
