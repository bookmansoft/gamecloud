let StatusMachine = require('javascript-state-machine')

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
        /**
         * 节点对象
         */
        this.parent = args[0];
    }
}

exports = module.exports = baseService