let CoreOfBase = require('../core/CoreOfBase')
/**
 * Created by liub on 2017-03-26.
 */
class baseCtl
{
    /**
     * 构造函数
     * @param {CoreOfBase} core 
     */
    constructor(core)
    {
        this.core = core;
    }

    echo() {
        return {code: 0, data: 'Hello World'};
    }
}

exports = module.exports = baseCtl;
