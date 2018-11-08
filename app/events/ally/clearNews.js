let facade = require('../../../facade/Facade')
let {EntityType} = facade.const

/**
 * 解散联盟
 */
function handle(event){ 
    facade.GetMapping(EntityType.AllyNews).groupDel(event.aid);
}

module.exports.handle = handle;
