let facade = require('../../Facade')
let {ReturnCode} = facade.const
let baseCtl = facade.Control

/**
 * 基础服务：任务管理
 * Updated by liub on 2017-05-05.
 */

class task extends baseCtl {
    async list(user, objData){
        return {
            code: ReturnCode.Success,
            data: user.baseMgr.task.getList(objData.type, objData.status)
        }
    }

    async getBonus(user, objData){
        return {
            code: ReturnCode.Success,
            data: user.baseMgr.task.getBonus(objData.id)
        }
    }
    async getInfo(user,objData){
        return {
            code: ReturnCode.Success,
            data: user.baseMgr.task.getTaskObj(objData.id)
        }
    }
}

exports = module.exports = task;
