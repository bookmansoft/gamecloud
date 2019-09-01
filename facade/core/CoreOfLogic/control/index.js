/**
 * Created by liub on 2017-04-06.
 */
let facade = require('../../Facade')
let {ReturnCode} = facade.const

/**
 * 缺省控制器，提供登录等最基本功能
 */
class index extends facade.Control
{
    /**
     * 用户登录
     * @param user
     * @param objData
     * @returns {Promise.<{}>}
     */
    async 1000(user, objData){
        return this.login(user, objData);
    }

    /**
     * 用户登录
     * @param {*} user 
     * @param {*} objData 
     */
    async login(user, objData){
        try {
            return await this.core.control.login.UserLogin(user, objData);
        } catch(e) {
            console.error(e);
        }
    }

    /**
     * 获取系统配置文件（JSON）
     * @param user
     * @param objData
     * @returns {Promise.<*>}
     */
    async config(user, objData) {
        if(objData.file == "sys"){ //禁止客户端直接访问系统配置文件
            return {code: ReturnCode.illegalData};
        }

        try{
            if(!!this.core.fileMap[objData.file]){
                return {code:ReturnCode.Success, data:this.core.fileMap[objData.file]};
            }
            else{
                return {code:ReturnCode.Error};
            }
        }catch(e){}
    }

    /**
     * 用户客户端获取服务端时间戳
     * @param {*} user 
     */
    getTime(user) {
        return {
            code:ReturnCode.Success,
            data: {
                time: Date.parse(new Date())/1000,
            }
        };
    }
}

exports = module.exports = index;
