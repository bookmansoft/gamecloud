let facade = require('../../../Facade')
let {ReturnCode, EntityType, PurchaseStatus} = facade.const

/**
 * 路由消息控制器
 * Updated by liub on 2017-05-05.
 */
class remote extends facade.Control
{
    /**
     * 中间件设定
     */
    get middleware(){
        return ['parseParams', 'commonHandle'];
    }
}

exports = module.exports = remote;
