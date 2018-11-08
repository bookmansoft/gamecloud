let facade = require('../../Facade')
let {em_Effect_Comm} = facade.const
let {LargeNumberCalculator} = require('../../util/comm/LargeNumberCalculator')
let {ToUpgradeResInfo} = require('../../util/commonFunc')
let EffectObject = require('../../util/comm/EffectObject');

/**
 * 君主天赋相关配置信息管理
 */
class ConfigManager
{
    /**
     * 图腾配置表
     *  effect(科技效果): 效果，初值，步进
     *  cost（升级）: 根据等级计算升级费用, 传入0得到激活费用
     *  max: 最大等级，为-1表示无限升级
     * @return array
     */
    static getTotemList() {
        if(ConfigManager.pTotemList == null){
            ConfigManager.pTotemList = {};
            facade.config.fileMap.pTotemList.map(item=>{
                item.cost = ($lv) => {
                    return parseInt(item.costValue) + $lv*5;
                }
                item.max = parseInt(item.max);
                item.active = item.active.split(';').reduce((sofar,cur)=>{
                    let s = cur.split(',');
                    sofar.push({id:parseInt(s[0]||0), value:parseInt(s[1]||0)});
                    return sofar;
                }, []);
                ConfigManager.pTotemList[item["id"]] = item;
            })
        }
        return ConfigManager.pTotemList;
    }

    static getActionConfig(){
        if(ConfigManager.pActionConfig == null){
            ConfigManager.pActionConfig = {};
            facade.config.fileMap.ActionConfig.map(item=>{
                ConfigManager.pActionConfig[item["id"]] = item;
            })
        }
        return ConfigManager.pActionConfig;
    }

    /**
     * PVP宠物列表
     *  id
     *  effect 宠物生产技能 : 效果，初值，步进
     *  cost 强化所需费用
     *  max 最大强化等级
     *  rtype:1~9
     *  ActionList: 英雄后天技能, 格式："技能ID,技能等级;..." 技能触发几率初始10%，技能等级每增加1级，几率增加2%，45级意味着100%发动
     * @return array
     */
    static getPetList(){
        if(ConfigManager.HeroList == null){
            ConfigManager.HeroList = {};
            facade.configration.HeroList.map(item=>{
                //升级消耗公式
                let ren = ToUpgradeResInfo(item.upgrade);
                item.upgrade = {type:ren.type, id: ren.id, calc: $lv => {
                    return ren.num + (parseInt($lv)-1) * parseInt(ren.step);
                }}

                //强化消耗公式
                ren = ToUpgradeResInfo(item.enhance);
                item.enhance = {type:ren.type, id: ren.id, calc: $lv => {
                    return (parseInt(ren.num) + Math.pow(parseInt($lv)-1, 3) * parseInt(ren.step)) | 0;
                }}

                //进阶消耗公式
                ren = ToUpgradeResInfo(item.adv);
                item.advance = {type:ren.type, id: ren.id, calc: ($lv) => {
                    return (parseInt(ren.num) + Math.pow(parseInt($lv)-1, 3) * parseInt(ren.step)) | 0;
                }}

                ConfigManager.HeroList[item["id"]] = item;
            })
        }
        return ConfigManager.HeroList;
    }

    /**
     * 法宝配置信息
     *  法宝ID
     *  前置法宝id
     *  前置法宝所需等级，为0则无约束力，1以上才有实际约束力
     *  effects：技能解锁, 10，25，50，75，100，125，150，175，之后每逢25的倍数，攻击力*4，每逢1000的倍数，攻击力*10
     *
     * @return array
     */
    static getList() {
        if(ConfigManager.pTechList == null){
            ConfigManager.pTechList = {};
            facade.config.fileMap.pTechList.map(item=>{
                item.effects = [];
                item.effectStr.split(';').map(effect=>{
                    if(!!effect){
                        let vs = effect.split(',');
                        if(!!vs && vs.length == 3){
                            item.effects.push({
                                level:vs[0],
                                effect: `${vs[1],vs[2]}`
                            });
                        }
                    }
                });
                let $ls = item.power.split(',');
                item.power = {ori:$ls[0], step:$ls[1], cost:$ls[2]};
                ConfigManager.pTechList[item["id"]] = item;
            })
        }
        return ConfigManager.pTechList;
    }

    /**
     * 计算指定ID的天赋，由lv1到lv2的升级费用。如果lv1==0，则返回激活费用
     * @param int $id
     * @param $lv1
     * @param $added
     * @return {LargeNumberCalculator}
     */
    static getCost($id, $lv1, $added){
        if(!ConfigManager.pTechList[$id]){
            return new LargeNumberCalculator(0,0);
        }

        if($lv1 == 0){
            return new LargeNumberCalculator(ConfigManager.pTechList[$id]['power']['cost'], 0);
        }
        else{
            return ConfigManager._getCostTotal($id, $lv1 + $added)._sub_(ConfigManager._getCostTotal($id, $lv1));
        }
    }
    /**
     * 
     * @param {*} int 
     * @param {*} int 
     * @return {LargeNumberCalculator}
     */
    static _getCostTotal($id, $lv)
    {
        if(!ConfigManager.pTechList[$id] || $lv <= 0){
            return new LargeNumberCalculator(0,0);
        }

        //升级初始消耗*（法宝升级消耗基数^（当前等级-1））
        $lv -= 1;
        let $ret = new LargeNumberCalculator(ConfigManager.pTechList[$id]['power']['cost'], 0);
        while($lv > 0){
            let $cur = $lv >= 100 ? 100 : $lv;
            $ret._mul_(Math.pow(1.06, $cur));
            $lv -= $cur;
        }
        return $ret;
    }

    /**
     * 获取PVE伙伴升级费用
     * @param $lv1
     * @param $added
     * @return {LargeNumberCalculator}
     * 
     * @note 计算公式：2*（1.06^（当前等级-1））
     */
    static getCostCPet($lv1, $added)
    {
        return LargeNumberCalculator.Power(ConfigManager.baseActiveBaseValue, $lv1 + $added - 1)._mul_(ConfigManager.baseActiveMoney);
    }

    /**
     * 获取PVE伙伴配置信息列表
     * @return array
     */
    static getFellowList() 
    {
        if(ConfigManager.pCPetList == null){
            ConfigManager.pCPetList = {};
            facade.config.fileMap.pCPetList.map(item=>{
                let ri = ToUpgradeResInfo(item.adv);
                //进阶配置
                item.advance = {
                    type:ri.type, 
                    id: ri.id, 
                    calc: ($lv) => {
                        return parseInt(ri.num) + $lv*50;
                    }
                };
                //激活配置
                item.activeInfo = ToUpgradeResInfo(item.chip);

                let $ls = item.power.split(',');
                item.power = {ori:$ls[0], step:$ls[1]};

                item.effects = []; //随等级解锁、提升攻击力的技能
                item.effectStr.split(';').map(effect=>{
                    if(!!effect){
                        let vs = effect.split(',');
                        if(!!vs && vs.length == 3){
                            item.effects.push({
                                level:vs[0],
                                effect: `${vs[1]},${vs[2]}`
                            });
                        }
                    }
                });

                ConfigManager.pCPetList[item["id"]] = item;
            })
        }
        return ConfigManager.pCPetList;
    }

    /**
     * 计算PVE伙伴进阶所需碎片
     * @param int $id
     * @param $lv1
     * @param $added
     * @return int
     */
    static getAdvanceCChip($id, $lv1, $added) {
        let ri = ConfigManager.getFellowList()[$id]['advance'];
        ri.num = $lv1 == 0 ? ri.calc(1) - ri.calc(0) : ri.calc($lv1 + $added) - ri.calc($lv1);
        return ri;
    }

    /**
     * 计算图腾升级费用（含激活）
     * @param int $id       //图腾ID
     * @param $lv1          //当前级别
     * @param $added        //希望增加的级数
     * @param $activeNum    //当前已经拥有的图腾数，拥有的数量越多，升级越贵
     * @return int
     */
    static getCostStone($id, $lv1, $added, $activeNum)
    {
        if($lv1 == 0){//召唤费用
            return 1000 * ($activeNum+1);
        }
        else{
            return ConfigManager.getTotemList()[$id]['cost']($lv1+$added) - ConfigManager.getTotemList()[$id]['cost']($lv1);
        }
    }

    /**
     * 法宝战斗力计算公式
     * @param {Number} $id
     * @return {Function}
     */
    static getEquPowerFormula($id)
    {
        return function($lv) {
            if(!ConfigManager.pTechList[$id]){
                return LargeNumberCalculator.Load(0);
            }
            if($lv <= 0){
                return LargeNumberCalculator.Load(ConfigManager.pTechList[$id]['power']['ori']);
            }
            else{
                return LargeNumberCalculator.Load(ConfigManager.pTechList[$id]['power']['ori'])._add_($lv * ConfigManager.pTechList[$id]['power']['step']);
            }
        };
    }

    /**
     * 根据id，给出计算天赋指定等级的战力的公式
     * @return {LargeNumberCalculator}
     */
    static getPowerFormula($id) {
        return function($lv) {
            if(!ConfigManager.getFellowList()[$id]){
                return 0;
            }
            if($lv <= 0){
                return LargeNumberCalculator.Load(ConfigManager.getFellowList()[$id]['power']['ori']);
            }
            else{
                return LargeNumberCalculator.Load(ConfigManager.getFellowList()[$id]['power']['ori'])._add_($lv * ConfigManager.getFellowList()[$id]['power']['step']);
            }
        };
    }
}

/**
 * 法宝配置列表
 * @var array
 */
ConfigManager.pTechList = null;
/**
 * 图腾配置表
 * @var array
 */
ConfigManager.pTotemList = null;
ConfigManager.pActionConfig = null;
/**
 * 宠物配置表
 * @var array
 */
ConfigManager.HeroList = null;
/**
 * PVE伙伴配置表
 * @var null
 */
ConfigManager.pCPetList = null;
ConfigManager.baseActiveMoney = 2;
ConfigManager.baseActiveBaseValue = 1.06;
ConfigManager.DefenseVsAttack = 4;

exports = module.exports = ConfigManager;