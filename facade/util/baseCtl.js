let CoreOfBase = require('../core/CoreOfBase')
/**
 * Created by liub on 2017-03-26.
 */
class baseCtl
{
    /**
     * 构造函数
     * @param {CoreOfBase} parent 
     */
    constructor(parent)
    {
        this.parent = parent;
    }

    echo() {
        return {code: 0, data: 'Hello World'};
    }
}

exports = module.exports = baseCtl;
