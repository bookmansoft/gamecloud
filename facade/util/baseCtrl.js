let facade = require('../Facade')
let {EntityType, ReturnCode} = facade.const
let CoreOfBase = facade.CoreOfBase

/**
 * Created by liub on 2017-03-26.
 */
class baseCtrl
{
    /**
     * 构造函数
     * @param {CoreOfBase} core 
     */
    constructor(core) {
        this.core = core;
    }

    /**
     * PING/PONG测试
     */
    echo() {
        return {code: 0, data: 'Hello Vallnet'};
    }
}

exports = module.exports = baseCtrl;
