let BaseLogEntity = require('../../../facade/model/entity/log')

/**
 * 用户角色类，继承自框架的UserBaseEntity
 */
class LogEntity extends BaseLogEntity
{
	constructor(buylog, core){
        super(buylog, core);
    }
}

exports = module.exports = LogEntity;