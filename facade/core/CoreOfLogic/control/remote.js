let facade = require('../../../Facade')

/**
 * 路由消息控制器
 * Updated by liub on 2017-05-05.
 */
class remote extends facade.RemoteLogicCtrl
{
    /**
     * 中间件设定
     */
    get middleware(){
        return ['parseParams', 'authRemote', 'commonHandle'];
    }
}

exports = module.exports = remote;
