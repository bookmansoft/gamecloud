let LargeNumberCalculator = require('./LargeNumberCalculator')

/**
 * Get current time in unix time (milliseconds).
 * @returns {Number}
 */
function ms() {
    if(!!Date.now){
        return Date.now();
    }
    else{
        return +new Date();
    }
};

/**
 * Get current time in unix time (seconds).
 * @returns {Number}
 */
function now() {
    return Math.floor(ms() / 1000);
};

/**
 * 技能特权对象
 *
 * Created by liub on 2017-04-07.
 */
class EffectObject
{
    constructor($eType, $eValue, $expired = 0, $power = 0){
        this.type = $eType;            //特权类型
        this.value = $eValue;          //特权效果，大数模式下的底数部分
        this.expired = $expired;       //有效期，为0表示永久有效，否则和当前时间比对
        this.power = $power;           //大数模式下的指数部分
    }

    /**
     * 剩余的有效时长
     * @returns {number}
     */
    getLeftTime(){
        let $cur = now();
        return this.expired > $cur ? this.expired - $cur : 0;
    }

    /**
     * 设置当前时间起，向后延长的有效时长（秒）
     * @param $len
     */
    setLeftTime($len){
        this.expired = now() + $len;
    }

    /**
     * @param $eo
     * 叠加相同类型的特权效果对象
     */
    Add($eo) {
        if(this.type == $eo.type){
            if(!!!this.expired || this.expired == 0){//永久有效的效果，数值叠加
                if(this.power > 0 || $eo.power > 0){
                    let $v = LargeNumberCalculator.instance(this.value, this.power)._add_(LargeNumberCalculator.instance($eo.value, $eo.power));
                    this.value = $v.base;
                    this.power  =$v.power;
                }
                else{
                    this.value += $eo.value;
                }
            }
            else{//有效期相叠加
                this.setLeftTime(this.getLeftTime() + $eo.getLeftTime());
            }
        }
    }

    Multi($rate){
        if(this.power > 0 || !!$rate.Recalc){
            let $v = LargeNumberCalculator.instance(this.value, this.power)._mul_($rate);
            this.value = $v.base;
            this.power  =$v.power;
        }
        else{
            this.value *= $rate;
        }
    }

    /**
     * 有效性检测
     * @return bool
     */
    isValid() {
        return this.expired == 0 || this.expired > now();
    }

    ToString() {
        return this.type + ',' + this.value + ',' + this.expired + ',' + this.power;
    }
}

exports = module.exports = EffectObject;
