/*
 * 复合信息标志位管理类
 * 使用先前的持久化字段创建该对象，进行相应的检测判断、置位/复位操作，最后取出最终值进行持久化
 */
class Indicator
{
    /**
     * 通过持久化字段初始化对象
     *
     * @param val
     * @private
     */
    constructor(val){
        this.indicate = !!val ? val : 0;
    }

    get value(){
        return this.indicate;
    }

    /**
     * 设置标志位，支持链式操作
     * @param val
     * @returns {Indicator}
     */
    set(val){
        this.indicate = this.indicate | val;
        return this;
    }

    /**
     * 重置标志位
     *
     * @param val
     */
    unSet(val){
        this.indicate = this.indicate & ~val;
        return this;
    }

    /**
     * 检测当前值
     *
     * @param val
     * @returns {boolean}
     */
    check(val){
        return !!this.indicate && (this.indicate & val) == val;
    }

    static inst(status){
        return new Indicator(status);
    }
}

exports = module.exports = Indicator;