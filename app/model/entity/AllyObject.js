let BaseAllyObject = require('../../../facade/model/entity/BaseAllyObject')

/**
 * 联盟类，继承自框架的BaseAllyObject
 */
class AllyObject extends BaseAllyObject
{
	constructor(orm, core){
        super(orm, core);
    }
}

exports = module.exports = AllyObject