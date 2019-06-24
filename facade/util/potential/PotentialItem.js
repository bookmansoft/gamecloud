let facade = require('../../Facade')
let {PotentialType, em_Effect_Comm} = facade.const
let PetClientItem = require('./PetClientItem')
let LargeNumberCalculator = require('../../../facade/util/comm/LargeNumberCalculator')
let EffectManager = require('../../../facade/util/comm/EffectManager')
let EffectObject = require('../../../facade/util/comm/EffectObject')

/**
 * 天赋对象，复用于法宝、图腾、PVE宠物、PVP宠物。
 * Class PotentialInfo
 * @package App\Logic\Potential
 * @property {LargeNumberCalculator} power
 */
class PotentialItem 
{
    /**
     * 构造函数
     * @param {*} $_type            天赋类型
     * @param {baseMgr} $parent     容器对象
     */
    constructor($_type, $parent) {
        this.parent = $parent;
        this.type = !!$_type ? $_type : PotentialType.Equ;
        /**
         * 记录升级所需花费
         * @var LargeNumberCalculator
         */
        this.money = new LargeNumberCalculator(0, 0);
        this.power = new LargeNumberCalculator(0, 0);
        
        /**
         * 编号，和PotentialConfig中的ID一一对应
         * @var int
         */
        this.id = 0;
        /**
         * 等级 为0时表示未激活，必须先执行激活操作后变为1
         * @var int
         */
        this.level = 0;
        /**
         * 强化等级
         * @var int
         */
        this.enLevel = 0;
        /**
         * 进阶阶数
         * @var int
         */
        this.adLevel = 0;
        /**
         * 当前圣光值
         */
        this.point = 0;
        /**
         * 效果管理器
         */
        this.eMgr = null;
    }

    /**
     * @return int
     */
    getEnLevel() {
        return this.enLevel;
    }

    /**
     * @param int $enLevel
     */
    setEnLevel($enLevel) {
        this.enLevel = parseInt($enLevel);
        if(!!this.eMgr){
            this.eMgr.SetEffectChanged();
        }
    }

    /**
     * @return int
     */
    getAdLevel() {
        return this.adLevel;
    }

    /**
     * @param int $adLevel
     */
    setAdLevel($adLevel)
    {
        this.adLevel = parseInt($adLevel);
        if(!!this.eMgr){
            this.eMgr.SetEffectChanged();
        }
    }

    /**
     * @return {LargeNumberCalculator}
     */
    getMoney()
    {
        return this.money;
    }

    /**
     * @param {LargeNumberCalculator} $money
     */
    setMoney($money) {
        this.money = $money;
    }

    /**
     * @return int
     */
    getLevel() {
        return this.level;
    }
    /**
     * @param int $level
     */
    setLevel($level)
    {
        this.level = parseInt($level);
        if(!!this.eMgr){
            this.eMgr.SetEffectChanged(); //效果发生了改变
        }
    }
    getCardLevel(){
        return Math.max(1, this.level);
    }

    /**
     * 当前圣光值
     * @return int
     */
    getPoint() {
        return this.point;
    }

    /**
     * 加点（圣光）
     * @param int $point
     */
    setPoint($point) {
        this.point = parseInt($point);
        if(!!this.eMgr){
            this.eMgr.SetEffectChanged();
        }
    }

    /**
     * 计算战力
     * @return {LargeNumberCalculator}
     */
    getPower() {
        //em_Effect_selfPower在内部已经计算完毕，外部不能重复计算
        switch(this.type){
            case PotentialType.Equ: //法宝的PVE Attack
                this.power = this._getEquPower(this.level);
                break;

            case PotentialType.CPet: //PVE伙伴的点击攻击力
                this.power = (this.parent.parent.core.potentialConfig.getPowerFormula(this.id))(this.level)
                    .CalcFinallyValue(this.effect(), [em_Effect_Comm.selfPower]);
                break;

            default:
                break;
        }
        return this.power;
    }
    /**
     * @return {LargeNumberCalculator}  
     */
    _getEquPower($_level) {
        let $power = (this.parent.parent.core.potentialConfig.getEquPowerFormula(this.id))($_level)
            .CalcFinallyValue(this.effect(), [em_Effect_Comm.selfPower]) //对自身攻击力的加成
            ._mul_(1 + 331 * this.point) ;//圣光基础加持，包括基础量331和圣光数量；图腾对圣光的增强放在外围计算

        return $power;
    }

    /**
     * 下一个级别的攻击力
     * @param {Number} $pm 下一個級別的增幅
     * @return {LargeNumberCalculator}
     */
    getNextPower($pm) {
        if(!$pm){
            $pm = 1;
        }
        switch(this.type){
            case PotentialType.Equ: //Equip PVE Attack
                return this._getEquPower(parseInt(this.level) + $pm);

            default:
                return this.power;
        }
    }

    /**
     * 转化为能和客户端适配的数据结构
     * @param {Number} 下一个等级跨度，默认为1，用于计算"下个等级"战力属性
     * @return {PetClientItem}
     * 
     */
    ToClient($pm)
    {
        if(!$pm){
            $pm = 1;
        }

        let $item = new PetClientItem();
        $item.i = this.id;
        $item.l = this.getLevel();
        $item.p = this.getPoint();
        $item.ad = this.adLevel;
        $item.en = this.enLevel;
        $item.b = this.getPower();
        $item.bn = this.getNextPower($pm);
        $item.m = this.getMoney();

        return $item;
    }

    //region 效果管理接口

    /**
     * 针对缘分武将的效果管理器
     * @param int $id
     * @return {EffectManager}
     *
     * @todo 尚未实现
     */
    effectRelated($id)
    {
        return new EffectManager();
    }

    /**
     * 通用的效果管理器
     *
     * @param int $nl           临时计算新的等级
     * @return {EffectManager}
     *
     * @note selfPower做了特殊处理：采用Multi并且连乘的计算模式，例如叠加两个3倍效果则变为 3*3=9 倍，而其他效果为 3+3=6 倍
     */
    effect($nl = 0){
        if(!this.eMgr || this.eMgr.GetEffectChanged() || $nl > 0){
            let $te = new EffectManager();
            let $calcLevel = ($nl == 0 ? this.level : $nl); 

            //重新计算效果
            switch(this.type){
                case PotentialType.Equ:
                {
                    let $list = this.parent.parent.core.potentialConfig.getList();
                    for(let $value of $list[this.id]['effects']){
                        if($calcLevel < $value['level']){
                            break;
                        }
                        let $it = $te.makeItem($value['effect']);
                        if($it.type == em_Effect_Comm.selfPower){
                            $te.MultiItem($it);
                        }
                        else{
                            $te.AddItem($it);
                        }
                    }
                    
                    //添加默认效果：逢25和1000倍数额外加成：
                    let $an = (($calcLevel - 175) / 25) | 0;
                    if($an >= 1){
                        let {base, power} = LargeNumberCalculator.Power(4, $an);
                        $te.MultiItem(new EffectObject(em_Effect_Comm.selfPower, base, 0, power));
                    }
                    let $bn = ($calcLevel / 1000) | 0;
                    if($bn >= 1){
                        let {base, power} = LargeNumberCalculator.Power(10, $bn);
                        $te.MultiItem(new EffectObject(em_Effect_Comm.selfPower, base, 0, power));
                    }
                    break;
                }

                case PotentialType.CPet:
                    let $list = this.parent.parent.core.potentialConfig.getFellowList();
                    for(let $value of $list[this.id]['effects']){ //统计因等级提升已经解锁的、增加攻击力的技能
                        if($calcLevel < $value['level']){
                            break;
                        }
                        let $it = $te.makeItem($value['effect']);
                        if($it.type == em_Effect_Comm.selfPower) {
                            $te.MultiItem($it);
                        }
                        else{
                            $te.AddItem($it);
                        }
                    }
                    
                    //添加默认技能：逢25和1000倍数额外加成
                    let $an = (($calcLevel - 175) / 25) | 0;
                    if($an >= 1){
                        let {base, power} = LargeNumberCalculator.Power(4, $an);
                        $te.MultiItem(new EffectObject(em_Effect_Comm.selfPower,base,0,power));
                    }
                    let $bn = ($calcLevel / 1000) | 0;
                    if($bn >= 1){
                        let {base, power} = LargeNumberCalculator.Power(10, $bn);
                        $te.MultiItem(new EffectObject(em_Effect_Comm.selfPower, base, 0, power));
                    }

                    //额外的技能, 配置信息位于 pCPetList.effect 字段
                    $list[this.id]['effect'].split(';').map(effect=>{
                        if(!!effect){
                            let vs = effect.split(',');
                            if(!!vs && vs.length == 3){
                                $te.AddItem(new EffectObject(parseInt(vs[0]), parseFloat(vs[1]) + parseFloat(vs[2])*this.getLevel()));
                            }
                        }
                    });
                        
                    break;

                case PotentialType.Pet:
                {
                    let $list = this.parent.parent.core.potentialConfig.getPetList();
                    let $params = $list[this.id]['effect'].split(',');
                    $te.AddItem(new EffectObject(parseInt($params[0]), parseFloat($params[1]) + parseFloat($params[2])*this.getLevel()));
                    break;
                }

                case PotentialType.Totem:
                {
                    let $list = this.parent.parent.core.potentialConfig.getTotemList();
                    let $params = $list[this.id]['effect'].split(',');
                    $te.AddItem(new EffectObject(parseInt($params[0]), parseFloat($params[1]) + parseFloat($params[2])*this.getLevel()));
                    break;
                }
            }
            
            this.eMgr = $te;
        }

        return this.eMgr;
    }

    //endregion
}

exports = module.exports = PotentialItem;