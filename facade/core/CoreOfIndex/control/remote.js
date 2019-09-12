/**
 * Updated by liub on 2017-05-05.
 */

let facade = require('../../../Facade')

class remote extends facade.RemoteIndexCtrl 
{
    get middleware() {
        return ['parseParams', 'authRemote', 'commonHandle'];
    }
}

exports = module.exports = remote;
