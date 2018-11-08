let facade = require('../../../facade/Facade')
let {EntityType} = facade.const
let AllyNews = facade.EntityList.AllyNews

/**
 * 生成新的联盟新闻
 */
function handle(event){ 
    facade.GetMapping(EntityType.AllyNews).Create(event.aid, event.type, event.value, facade.util.now());
}

module.exports.handle = handle;
