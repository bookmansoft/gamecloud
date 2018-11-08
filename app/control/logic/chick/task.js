let facade = require('../../../../facade/Facade')
/**
 * 配置管理器
 * Updated by liub on 2017-05-05.
 */
class task extends facade.Control 
{
    async list(user, objData){
        return {
            code: facade.const.ReturnCode.Success,
            data: user.baseMgr.task.getList(objData.type, objData.status)
        }
    }

    async getBonus(user, objData){
        return {
            code: facade.const.ReturnCode.Success,
            data: user.baseMgr.task.getBonus(objData.id)
        }
    }
    async getInfo(user,objData){
        return {
            code: facade.const.ReturnCode.Success,
            data: user.baseMgr.task.getTaskObj(objData.id)
        }
    }
}

exports = module.exports = task;
