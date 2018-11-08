let facade = require('../../../facade/Facade')
let {ReturnCode, UserStatus, em_Condition_Type, em_Condition_Checkmode, NotifyType, ActivityType, RankType, em_EffectCalcType,em_Effect_Comm,mapOfTechCalcType} = facade.const

/**
 * 配置管理器
 * Updated by liub on 2017-05-05.
 */
class config extends facade.Control {
    /**
     * 中间件设定，子类可覆盖
     */
    get middleware(){
        return ['parseParams', 'commonHandle'];
    }

    /**
     * 查询并返回配置文件
     * @param user
     * @param objData
     * @returns {Promise.<*>}
     */
    async get(user, objData) {
        try{
            if(!!facade.configration[objData.file]){
                return {code:ReturnCode.Success, data:facade.configration[objData.file]};
            }
            else{
                return {code:ReturnCode.Error};
            }
        }
        catch(e){
            console.error(e);
        }
    }
}

exports = module.exports = config;
