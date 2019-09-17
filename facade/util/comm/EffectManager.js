/**
 * Created by liub on 2017-04-07.
 */
let facade = require('../../Facade')
let LargeNumberCalculator = facade.Util.LargeNumberCalculator
let EffectObject = facade.Util.EffectObject
let {em_EffectCalcType, mapOfTechCalcType} = facade.const

/**
 * 技能特效管理器
 */
class EffectManager
{
    constructor($val){
        this.mixin($val);
    }

    /**
     * 初始化函数，供Mixin Master调用
     * @param {*}  
     */
    mixin($val){
        this.effectList = {};

        if($val != null && $val != ''){
            //读取配置表并形成特权对象列表
            for(let item of $val.split(';')) {
                this.AddItem(this.makeItem(item));
            }
        }
    }
    /**
     * 根据字符串构造一个效果对象
     * @param string $val
     * @return {EffectObject}
     */
    makeItem($val) {
        let $items = $val.split(',');
        if($items.length >= 2){
            return new EffectObject(parseInt($items[0]), parseFloat($items[1]));
        }
        return new EffectObject(0, 0);
    }

    /**
     * 对象序列化
     * @return string
     */
    ToString() {
        let $ret = '';
        for(let $key in this.effectList){
            if($ret != ''){
                $ret += ';';
            }
            $ret += this.effectList[$key].ToString();
        }
        return $ret;
    }

    /**
     * 将技能列表转化为数组
     */
    toArray(){
        return Object.keys(this.effectList).reduce((sofar,cur)=>{
            sofar.push(this.effectList[cur]);
            return sofar;
        },[]);
    }

    /**
     * 清空全部现有效果
     */
    Clear() {
        this.effectList = {};
        return this.SetEffectChanged(true);
    }

    /**
     * 清理失效的效果
     * @return {EffectTimerManager}
     */
    ClearExpired() {
        for(let $key in this.effectList){
            if(!this.effectList[$key].isValid()){
                delete this.effectList[$key];
                this.dirty = true;              //设置脏数据标志
            }
        }
        return this;
    }

    /**
     * 叠加其他特权管理器, 支持链式操作
     * @param $em
     */
    Add($em){
        if($em.constructor == String){
            $em.split(';').map(item=>{
                let _eff = item.split(',');
                if(_eff.length >= 2){
                    this.AddItem(new EffectObject(parseInt(_eff[0]), parseFloat(_eff[1])));
                }
            });
        }
        else{
            Object.keys($em.effectList).map(key=>{
                if (!this.effectList[key]) {//之前不存在该种特权
                    this.effectList[key] = $em.effectList[key];
                } else {
                    this.effectList[key].Add($em.effectList[key]);
                }
            });
        }
        this.SetEffectChanged();
        return this;
    }

    /**
     * 传入特权类型、特权初始值, 累计所有特权加持效果，得到加持后的特权最终值
     * @param $_effect
     * @param $oriValue
     * @return {*}
     */
    CalcFinallyValue($_effect, $oriValue)
    {
        if (!mapOfTechCalcType[$_effect] || !this.effectList[$_effect]) {
            return $oriValue;
        }

        let $ct = mapOfTechCalcType[$_effect];

        if(this.effectList[$_effect].power > 0 || !!$oriValue.Recalc){
            switch ($ct) {
                case em_EffectCalcType.em_EffectCalc_Multiplication:
                    return LargeNumberCalculator.Load($oriValue)._mul_(LargeNumberCalculator.instance(this.effectList[$_effect].value, this.effectList[$_effect].power));
                case em_EffectCalcType.em_EffectCalc_Addition:
                    return LargeNumberCalculator.Load($oriValue)._add_(LargeNumberCalculator.instance(this.effectList[$_effect].value, this.effectList[$_effect].power));
                case em_EffectCalcType.em_EffectCalc_Subduction:
                    return LargeNumberCalculator.Load($oriValue)._sub_(LargeNumberCalculator.instance(this.effectList[$_effect].value, this.effectList[$_effect].power));
                case em_EffectCalcType.em_EffectCalc_Division:
                    return LargeNumberCalculator.Load($oriValue)._dev_(LargeNumberCalculator.instance(this.effectList[$_effect].value, this.effectList[$_effect].power));
            }
        }else{
            switch ($ct) {
                case em_EffectCalcType.em_EffectCalc_Multiplication:
                    return $oriValue * (1 + this.effectList[$_effect].value);
                case em_EffectCalcType.em_EffectCalc_Addition:
                    return $oriValue + this.effectList[$_effect].value;
                case em_EffectCalcType.em_EffectCalc_Subduction:
                    return $oriValue - this.effectList[$_effect].value;
                case em_EffectCalcType.em_EffectCalc_Division:
                    return $oriValue * (1 - this.effectList[$_effect].value);
            }
        }
        return $oriValue;
    }

    /**
     * 获取脏数据标志
     * @return bool
     */
    GetEffectChanged() 
    {
        return this.dirty;
    }

    /**
     * 设置脏数据标志 返回自身
     * @param $c
     * @return this
     */
    SetEffectChanged($c = true)
    {
        this.dirty = $c;
        return this;
    }

    /**
     * 叠加单个特权效果对象 支持链式操作
     * @param $eo
     * @return this
     */
    AddItem($eo)
    {
        if (!this.effectList[$eo.type]) {
            this.effectList[$eo.type] = $eo;
        } else {
            this.effectList[$eo.type].Add($eo);
        }
        //设置变化标志，以便上级效果器能够感知
        this.SetEffectChanged();
        return this;
    }

    /**
     * 采取特殊的效果叠加方式：数值相乘。目前只用于selfPower内部运算中
     * @param {EffectObject} $eo
     * @return {EffectManager}
     */
    MultiItem($eo) {
        if (!this.effectList[$eo.type]) {
            this.effectList[$eo.type] = $eo;
        } else {
            this.effectList[$eo.type].Multi(LargeNumberCalculator.instance($eo.value, $eo.power)._add_(1)); //$eo的数值中只包含增量部分，所以此处加1
        }
        //设置变化标志，以便上级效果器能够感知
        this.SetEffectChanged();
        return this;
    }

    /**
     * 对所有特权做比率变化
     * @param $_rate 准备变化的比率值
     * @return {EffectManager}
     */
    Multi($_rate)
    {
        Object.keys(this.effectList).map(key=>{
            this.effectList[key].Multi($_rate);

        });
        this.SetEffectChanged();
        return this;
    }
}

exports = module.exports = EffectManager;
