let StatusMachine = require('javascript-state-machine')
let CoreOfBase = require('../core/CoreOfBase')

/**
 * 扩展服务类的基类
 */
class baseService extends StatusMachine
{
    /**
     * 构造函数
     */
    constructor(...args){
        super(args[1]);
        this.parent = args[0];
    }
}

exports = module.exports = baseService