/**
 * 用于大数据运算的复数类
 * Class PotentialValue
 */
class LargeNumberCalculator{
    constructor($_base = 0, $_power = 0){
        /**
         * 基数
         * @var int
         */
        this.base = $_base;
        /**
         * 指数
         * @var int
         */
        this.power = $_power; 
        
        this.Recalc();
    }

    static instance($_base = 0, $_power = 0)
    {
        return new LargeNumberCalculator($_base, $_power);
    }

    /**
     * 归零操作
     * @return {LargeNumberCalculator}
     */
    zero()
    {
        this.base = 0;
        this.power = 0;
        return this;
    }

    /**
     * 反序列化
     * @param {*} $money
     * @return {LargeNumberCalculator}
     */
    static FromString($money)
    {
        if(!!$money && (typeof $money == 'string')){
            let $list = $money.split(',');
            if($list.length == 2){
                return new LargeNumberCalculator(parseFloat($list[0]), parseInt($list[1]));
            }
        }
        return new LargeNumberCalculator(0, 0);
    }

    /**
     * 计算base的power次方，转化为大数返回
     * @param {*} base 
     * @param {*} power 
     * @return {LargeNumberCalculator}
     */
    static Power(base, power){
        if(base < 100 && power < 100){
            return LargeNumberCalculator.instance(Math.pow(base, power));
        }

        let ret = new LargeNumberCalculator(1, 0);
        while(power > 0){
            let $cur = power >= 100 ? 100 : power;
            power -= $cur;

            ret.base *= Math.pow(base, $cur);
            ret.Recalc();
        }

        return ret;
    }

    /**
     * 序列化
     * @return string
     */
    ToString()
    {
        return `${this.base},${this.power}`;
    }

    /**
     * 转为数组
     * @return array
     */
    ToArray()
    {
        return {'base': this.base, 'power': this.power};
    }

    /**
     * 比较函数
     * @param $b
     * @return int
     */
    _compare_($b){
        if($b.constructor == Array && $b.length == 2){
            $b = LargeNumberCalculator.instance($b[0], $b[1]);
        }
        return LargeNumberCalculator.Compare(this, $b);
    }

    /**
     * 加法
     * @param $sim
     * @return {LargeNumberCalculator}
     */
    _add_($sim)
    {
        let $ret = LargeNumberCalculator.Load($sim);
        if(this.power > $ret.power + LargeNumberCalculator.scope){
        }
        else if(this.power < $ret.power - LargeNumberCalculator.scope){
            this.base = $ret.base;
            this.power = $ret.power;
        }
        else{
            this.base += $ret.base / Math.pow(10, this.power - $ret.power);
            this.Recalc();
        }
        return this;
    }

    /**
     * 减法
     * @param $sim
     * @return {LargeNumberCalculator}
     */
    _sub_($sim)
    {
        let $ret = LargeNumberCalculator.Load($sim);
        if(this.power > $ret.power + LargeNumberCalculator.scope){
        }
        else if(this.power < $ret.power - LargeNumberCalculator.scope){
            this.base = -($ret.base);
            this.power = $ret.power;
        }
        else{
            this.base -= $ret.base / Math.pow(10, this.power - $ret.power);
            this.Recalc();
        }
        return this;
    }

    /**
     * 乘法
     * @param $sim
     * @return {LargeNumberCalculator}
     */
    _mul_($sim)
    {
        let $ret = LargeNumberCalculator.Load($sim);
        this.base *= $ret.base;
        this.power += $ret.power;
        this.Recalc();
        return this;
    }

    _clone_()
    {
        return LargeNumberCalculator.instance(this.base, this.power);
    }

    /**
     * 除法
     * @param $sim
     * @return {LargeNumberCalculator}
     */
    _dev_($sim)
    {
        let $ret = LargeNumberCalculator.Load($sim);
        if($ret.base == 0){
            throw new Error('Dve zero!');
        }
        this.base /= $ret.base;
        this.power -= $ret.power;
        this.Recalc();
        return this;
    }

    /**
     * 加法操作
     * @param $a
     * @param $b
     * @return {LargeNumberCalculator}
     */
    static Add($a, $b)  { return LargeNumberCalculator.Load($a)._add_($b); }
    /**
     * 减法操作
     * @param $a
     * @param $b
     * @return {LargeNumberCalculator}
     */
    static Sub($a, $b) { return LargeNumberCalculator.Load($a)._sub_($b); }
    /**
     * 乘法操作
     * @param $a
     * @param $b
     * @return {LargeNumberCalculator}
     */
    static Mul($a, $b) { return LargeNumberCalculator.Load($a)._mul_($b); }
    /**
     * 除法操作
     * @param {LargeNumberCalculator} $a
     * @param {LargeNumberCalculator} $b
     * @return {LargeNumberCalculator}
     */
    static Dev($a, $b) { return LargeNumberCalculator.Load($a)._dev_($b); }
    /**
     * 复制操作
     * @param {LargeNumberCalculator}  $a
     * @return {LargeNumberCalculator}  
     */
    static Clone($a) { return LargeNumberCalculator.Load($a)._clone_(); }

    /**
     * 对传入数值进行规整，返回符合规定的复数对象
     * @param $sim
     * @return {LargeNumberCalculator}
     */
    static Load($sim){
        if(!!$sim.Recalc){//本身是复数
            $sim.Recalc();
            return $sim;
        }
        else{//当作基本类型处理
            let ret = new LargeNumberCalculator(parseFloat($sim), 0);
            ret.Recalc();
            return ret;
        }
    }
    /**
     * 比较函数
     * @param $a
     * @param $b
     * @return int 1大于 0等于 -1小于
     */
    static Compare($a, $b)
    {
        let ret = LargeNumberCalculator.Sub($a._clone_(), $b).base;
        if(ret > 0){
            return 1;
        }
        else if(ret == 0){
            return 0;
        }
        else {
            return -1;
        }
    }

    /**
     * 对数据进行规整
     * @return {LargeNumberCalculator}
     */
    Recalc()
    {
        if(this.base == 0){
            this.power = 0;
        }
        else{
            while(Math.abs(this.base) >= 10){
                this.base = this.base / 10.0;
                this.power += 1;
            }
            while(Math.abs(this.base) < 1){
                this.base *= 10;
                this.power -= 1;
            }
            this.base = parseFloat(this.base.toFixed(4));
        }
        return this;
    }

    /**
     * 返回经过效果加持器加持后的效果
     * @param {EffectManager} $eMgr
     * @param {Number} $eType
     * @return {LargeNumberCalculator}
     */
    CalcFinallyValue($eMgr, $typeList)
    {
        let ret = LargeNumberCalculator.Clone(this);
        for(let $tp of $typeList){
            ret = LargeNumberCalculator.Load($eMgr.CalcFinallyValue($tp, ret));
        }
        ret.Recalc();
        this.base = ret.base;
        this.power = ret.power;
        return this;
    }
}

/**
 * 安全数值范围
 */
LargeNumberCalculator.scope = 8;
        
exports.LargeNumberCalculator = LargeNumberCalculator;
