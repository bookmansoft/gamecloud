let facade = require('../../../../facade/Facade')
let {RecordType, IndexType, EntityType, SkillType, PurchaseType, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = require('../../../model/entity/UserEntity')
let PotentialClientItem = require('../../../../facade/util/potential/PetClientItem')
let BattleRoom = require('../../../../facade/util/battle/BattleManager')
let ConfigManager = require('../../../../facade/util/potential/ConfigManager')
let {ConfigMgr} = require('../../../../facade/util/battle/Action')
let {BaseBattleParam} = require('../../../../facade/util/battle/util')
let {BattleHero} = require('../../../../facade/util/battle/hero');

/**
 * PVP英雄操作类型码
 * Class em_Pet_OperType
 * @package App\Http\Packet\Input
 */
const em_Pet_OperType = {
    /**
     * 查询列表 列出所有PVP英雄，包括激活、未激活
     */
    query: 1,
    /**
     * 升级 使用通用强化碎片（ResType.chip）进行等级提升，可提升至当前星级允许的最大等级
     */
    upgrade: 2,
    /**
     * 强化 使用专用强化碎片(ResType.PetChipHead)进行激活或者强化，以提升卡牌的星级，解锁新的技能
     */
    enhance: 3,
    /**
     * 进阶 使用通用进阶碎片（ResType.advancedChip）进行进阶，以提升卡牌的品质
     */
    advance: 4,
    /**
     * 获取专属碎片 --- 三界符抽奖
     */
    getChip: 5,
    /**
     * 发起一场随机战斗
     */
    battle: 6,
    /**
     * 加入分组
     */
    joinGroup: 7,
    /**
     * 离开分组
     */
    leaveGroup: 8,
    /**
     * 查询全部分组信息
     */
    queryGroup: 9,
    /**
     * 查询对手默认卡组
     */
    queryEnemy:10,
    /**
     * 10连抽
     */
    getChips: 11,
}

/**
 * PVP英雄相关操作
 */
class P502001 extends facade.Control
{
    /**
     * @brief 502001报文：查询并获取PVP英雄列表、激活、升级强化进阶
     * @date   2016.10.16
     * @author bookman
     * 
     * @param {UserEntity} user
     * @param  :
     * name     | type     | description of param
     * ---------|----------|--------------------
     * oper     | int      | 操作码 1查询 2升级 3强化 4进阶 5获取碎片（仅测试）
     * id       | int      | 指定的PVP英雄编号，查询列表时可不填写
     * pm       | int      | 附加参数，升级时表示一次升多少级
     *
     * @return
     * name     | type     | description of value
     * -------- |----------|----------------------
     * code     | int      | 返回码
     * data     | int      | 返回数据对象
     * .chip    | int      | 万能强化碎片
     * .adChip  | int      | 万能进阶碎片
     * .items   | array    | PVP英雄列表
     * ..i      | int      | 编号
     * ..l      | int      | 当前等级
     * ..en     | int      | 当前强化等级
     * ..ad     | int      | 当前进阶等级
     * ..p      | int      | 当前拥有的专属碎片数量 point
     * ..b      | int      | 当前战力 power
     *
     * @note 查询列表暂不考虑分页功能；目前无论是查询列表，还是升级强化进阶，都返回完整的列表，优化阶段将改为只返回受影响的项目列表
     */
    async Execute(user, input) {
        input.pm = input.pm || 1;
        input.id = input.id || 1;
        input.oper = input.oper || 1;
        input.gid = input.gid || 0;

        input.pm = parseInt(input.pm);
        input.id = parseInt(input.id);
        input.oper = parseInt(input.oper);
        input.gid = parseInt(input.gid);

        let $data = new D502001();
        let $code = ReturnCode.Success;
        let $control = user.getPotentialMgr();

        switch(input.oper){
            case em_Pet_OperType.query:
            {
                let $list = $control.GetHeroList();
                for(let $key in $list){
                    this.queryItem($list[$key], $data, user);
                }
                $data.chip = user.getPocket().GetRes(ResType.chip);             //万能强化碎片
                $data.adChip = user.getPocket().GetRes(ResType.advancedChip);   //万能进阶碎片
                break;
            }

            case em_Pet_OperType.upgrade:
            {
                $code = $control.UpgradeHero(user, input.id, input.pm);
                let $list = $control.GetHeroList();
                this.queryItem($list[input.id], $data, user);
                $data.chip = user.getPocket().GetRes(ResType.chip);             //万能强化碎片
                $data.adChip = user.getPocket().GetRes(ResType.advancedChip);   //万能进阶碎片
                break;
            }

            case em_Pet_OperType.enhance:
            {
                $code = $control.EnhanceHero(user, input.id, input.pm);
                let $list = $control.GetHeroList();
                this.queryItem($list[input.id], $data, user);
                $data.chip = user.getPocket().GetRes(ResType.chip);             //万能强化碎片
                $data.adChip = user.getPocket().GetRes(ResType.advancedChip);   //万能进阶碎片
                break;
            }

            case em_Pet_OperType.advance:
            {
                $code = $control.AdvanceHero(user, input.id, input.pm);
                break;
            }

            case em_Pet_OperType.getChips://三界符，11连抽
            {
                if(!user.purchase(PurchaseType.RandomCard, 10, true)) {
                    $code = ReturnCode.NotEnough_Diamond;
                }
                else{
                    //确保最多掉落10种物品
                    for(let i = 0; i < 8; i++){
                        switch(facade.util.rand(1,3)){
                            case 2:
                                user.getBonus({type: ResType.PetChipHead, id: 0, num: 1});//专属强化碎片
                                break;
                            case 3:
                                user.getBonus({type: ResType.advancedChip, id: 0, num: 1});//万能进阶碎片
                                break;
                            default:
                                user.getBonus({type: ResType.chip, id: 0, num: 1});//万能强化碎片
                                break;
                        }
                    }
                    for(let i = 0; i < 3; i++){
                        switch(facade.util.rand(1,3)){
                            case 3:
                                user.getBonus({type: ResType.advancedChip, id: 0, num: 1});//万能进阶碎片
                                break;
                            default:
                                user.getBonus({type: ResType.chip, id: 0, num: 1});//万能强化碎片
                                break;
                        }
                    }
                    let $list = $control.GetHeroList();
                    for(let $key in $list){
                        this.queryItem($list[$key], $data, user);
                    }
                    $data.chip = user.getPocket().GetRes(ResType.chip);             //万能强化碎片
                    $data.adChip = user.getPocket().GetRes(ResType.advancedChip);   //万能进阶碎片
                    }
                break;
            }

            case em_Pet_OperType.getChip: //三界符
            {
                if(!user.getActionMgr().Execute(ActionExecuteType.AE_Chip, 1, true) && !user.purchase(PurchaseType.RandomCard, 1, true)){
                    $code = ReturnCode.NotEnough_Diamond;
                }
                else{
                    switch(facade.util.rand(1,3)){
                        case 2:
                            user.getBonus({type: ResType.PetChipHead, id: 0, num: 1});//专属强化碎片
                            break;
                        case 3:
                            user.getBonus({type: ResType.advancedChip, id: 0, num: 1});//万能进阶碎片
                            break;
                        default:
                            user.getBonus({type: ResType.chip, id: 0, num: 1});//万能强化碎片
                            break;
                    }
                    let $list = $control.GetHeroList();
                    for(let $key in $list){
                        this.queryItem($list[$key], $data, user);
                        }
                        $data.chip = user.getPocket().GetRes(ResType.chip);             //万能强化碎片
                        $data.adChip = user.getPocket().GetRes(ResType.advancedChip);   //万能进阶碎片
                    }
                break;
            }

            case em_Pet_OperType.battle:
            {
                //获取敌对玩家
                /**
                 * @type {UserEntity}
                 */
                let enemy = facade.GetObject(EntityType.User, input.openid, IndexType.Foreign);
                if(!enemy){
                    $code = ReturnCode.paramError;
                    break;
                }

                //获取指定参与战斗的卡牌编组信息
                if(input.gid<0 || input.gid >= 5){
                    input.gid = user.getInfoMgr().GetRecord(RecordType.Group); //填充默认编组
                }
                //更新默认编组
                user.getInfoMgr().SetRecord(RecordType.Group, input.gid); 

                //攻方技能列表
                let skillsOfAtk = BattleRoom.getSkills(
                    user.getPotentialMgr().getLocArray(input.gid), 
                    user
                );
                //守方技能列表
                let skillsOfDfs = BattleRoom.getSkills(
                    enemy.getPotentialMgr().getLocArray(enemy.getInfoMgr().GetRecord(RecordType.Group)),
                    enemy
                );

                //计算战斗过程，填充下行战报
                let br = BattleRoom.CreateRoom(...[
                    {player:user, id:user.id, lv: user.getPotentialMgr().GetHero(1).getCardLevel(), skill:skillsOfAtk},  //代表攻方的玩家，携带特定卡组，其中第一张固定为悟空，其等级就是君主等级。后续卡牌转化为主角附加技能，其等级随配置。
                    {player:enemy, id:enemy.id, lv: enemy.getPotentialMgr().GetHero(1).getCardLevel(), skill:skillsOfDfs}         //代表守方的玩家，携带特定卡组。
                ]);

                try{
                    let rs = br.QuickBattle();//计算结果并输出战斗过程

                    //结算战果
                    if(br.victory){
                        user.score += 3;
                    }
                    else{
                        user.score += 1;
                    }
    
                    //测试阶段，客户端需要翻译信息
                    if(input.debug == "1"){
                        $data.operation = [];
                        let reflect = {0:true};
                        while(rs.length>0){
                            let $item = rs.splice(0,1)[0];
                            if(!!reflect[$item.PreCondition]){
                                $data.operation.push($item.translate().params.desc);
                                reflect[$item.EventIndex] = true;
                            }
                            else{
                                rs.push($item);
                            }
                        }
                    }
                    else{
                        $data.operation = rs;
                    }
                }
                catch(e){
                    console.error(e);
                }

                break;
            }

            case em_Pet_OperType.queryEnemy:
            {
                //获取敌对玩家
                /**
                 * @type {UserEntity}
                 */
                let enemy = facade.GetObject(EntityType.User, input.openid, IndexType.Foreign);
                if(!enemy){
                    $code = ReturnCode.UserNotExist;
                    break;
                }

                $data.loc = enemy.getPotentialMgr().getLocArray(1).map(cur=>{
                    return {id:cur, lv:enemy.getPotentialMgr().GetHero(cur).getCardLevel()};
                });
                $data.loc.push({id:1, lv:enemy.getPotentialMgr().GetHero(1).getCardLevel()});
                let power = $data.loc.reduce((sofar, cur)=>{
                    let [atk, dfs] = this.getPower(cur.id,enemy);
                    sofar[0] += atk;
                    sofar[1] += dfs;
                    return sofar;
                }, [0, 0]);
                $data.power = power[0]*power[1];

                break;
            }

            case em_Pet_OperType.queryGroup:
                //卡组战斗力 = 相对攻击之和 * 相对生命之和
                $data.loc = user.getPotentialMgr().getLocArrayList();
                $data.power = Object.values($data.loc).reduce((sofar,cur)=>{
                    let power = cur.reduce((sofar, cur)=>{
                        let [atk, dfs] = this.getPower(cur,user);
                        sofar[0] += atk;
                        sofar[1] += dfs;
                        return sofar;
                    }, [0, 0]);

                    sofar.push(power[0]*power[1]);
                    return sofar;
                }, []);
                break;
            
            case em_Pet_OperType.joinGroup:
                {
                    let loc = user.getPotentialMgr().getLocArray(input.gid);
                    if(!loc){
                        $code = ReturnCode.paramError;
                    }
                    else{
                        if(loc.indexOf(input.id.toString()) == -1){
                            let nl = loc.reduce((sofar,cur)=>{
                                sofar += `,${cur}`;
                                return sofar;
                            }, `${input.id}`);
                            if(!user.getPotentialMgr().setLocArray(input.gid, nl)){
                                $code = ReturnCode.paramError;
                            }
                        }
                    }

                    $data.loc = user.getPotentialMgr().getLocArray(input.gid);
                    let power = $data.loc.reduce((sofar, cur)=>{
                        let [atk, dfs] = this.getPower(cur,user);
                        sofar[0] += atk;
                        sofar[1] += dfs;
                        return sofar;
                    }, [0, 0]);
                    $data.power = power[0]*power[1];
    
                    break;
                }

            case em_Pet_OperType.leaveGroup:
                {
                    let loc = user.getPotentialMgr().getLocArray(input.gid);
                    if(!loc){
                        $code = ReturnCode.paramError;
                    }
                    else{
                        while(true){
                            let idx = loc.indexOf(input.id.toString());
                            if(idx == -1){
                                break;
                            }
    
                            loc.splice(idx, 1);
                            user.getPotentialMgr().saveLocarray(input.gid, loc);
                        }
                    }

                    $data.loc = user.getPotentialMgr().getLocArray(input.gid);
                    let power = $data.loc.reduce((sofar, cur)=>{
                        let [atk, dfs] = this.getPower(cur,user);
                        sofar[0] += atk;
                        sofar[1] += dfs;
                        return sofar;
                    }, [0, 0]);
                    $data.power = power[0]*power[1];
    
                    break;
                }
        }

        return {code:$code, data: $data};
    }

    getPower(id,user){
        let $ho = BattleHero.CreateInstance(
            null, 
            5, 
            ConfigMgr.PetList()[id], 
            user.getPotentialMgr().GetHero(id).getCardLevel(),
            user.getPotentialMgr().GetHero(id).getEnLevel() || 1
        );

        return [$ho.BattleParam.AttackOfEffect, $ho.BattleParam.DefenseOfEffect];
    }

    queryItem($value, $data, user){
        let $hi = ConfigManager.getPetList()[$value.id];

        $data.items[$value.id] = {i:$value.id, l: $value.getLevel(), en:$value.enLevel, ad: $value.adLevel};
        $data.items[$value.id].p = user.getPocket().GetRes(ResType.PetChipHead, $value.id); //专属碎片

        let $reqChip = $hi.upgrade;
        $data.items[$value.id].c_up = `${$value.getLevel()==99 ? 0 : $reqChip.calc($value.getLevel() + 1)}`;
        $reqChip = $hi.enhance;
        $data.items[$value.id].c_en = `${$value.getEnLevel()==5 ? 0 : $reqChip.calc($value.getEnLevel() + 1)},${user.getPocket().GetRes($reqChip.type, $reqChip.id)}`;
        $reqChip = $hi.advance;
        $data.items[$value.id].c_adv = `${$value.getAdLevel()==5 ? 0 : $reqChip.calc($value.getAdLevel() + 1)}`;

        $data.items[$value.id].Attack = $hi.attack;              //攻击
        $data.items[$value.id].Defense = $hi.defense;            //最大生命
        let bp = new BaseBattleParam();
        $data.items[$value.id].bp = bp.read(...ConfigMgr.ProfessionList()[$hi.profession].BP).multi((1+0.05*$value.getLevel())); //荣誉值集合 - 使用配置表进行初始化
    }
}

/**
 * 返回报文 Class D502001
 */
class D502001
{
    constructor(){
        /**
         * 碎片
         * @var int
         */
        this.chip = 0;
        /**
         * 进阶碎片
         * @var int
         */
        this.adChip = 0;
        /**
         * PVP英雄列表
         * @var array
         */
        this.items = {};
        /**
         * 战报
         */
        this.operation = [];
        /**
         * 卡牌编组信息
         * 当操作字为7/8时，下发单个分组信息（表示单个分组的数组），当操作字为9时，下发全部分组列表（包含全部分组的对象），如 [1,2,3]
         * 当操作字为10时，下发单个分组，包含组成该分组的各个卡牌的详细信息，如 [{id:1,lv:1},{id:2,lv:3}]
         */
        this.loc = [];
    }
}

exports = module.exports = P502001;
