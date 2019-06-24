let facade = require('../../Facade')
let {SkillType, em_Effect_Name, em_Effect_Comm, em_EffectCalcType, mapOfTechCalcType} = facade.const
let {NotifyEnum, OperationType, EmitType,PeriodTypeEnum,BattleBuffEnum,AttackMode} = require('./enum')
let {BattleHero} = require('./hero');

let EventEmitter = require('events').EventEmitter; //事件管理
let EffectManager = require('../comm/EffectManager');

/**
 * 战场中使用的用户映射类
 */
class BattleUser extends EventEmitter
{
    /**
     * 构造函数
     * @param {Object}      $_owner {player, id, lv, skill}
     * @param {BattleRoom}  $bo   
     */
    constructor($_owner, $bo){
        super();

        this.user = $_owner;    //归属用户属性对象
        this.room = $bo;        //归属牌局 BattleRoom
        this.CurrentSiteNo = -1;//当前行动英雄座号
        this._CountVersion = 0; //行动回合计数
        this.Combo = 0; //连击数, 累计到10、发动EX后恢复为0
        this.CurrentPeriod = PeriodTypeEnum.None;//玩家当前牌局阶段
        //光环管理器
        this.effectMgr = new EffectManager();

        //初始阵型信息
        this._HeroList = {0: null,1: null,2: null,3: null,4: null,5: null,6: null,7: null,8: null};

        //创建首发英雄- 悟空
        this.master = this.summon(1, this.user.skill); //召唤悟空，其余卡牌作为悟空的附加技能注入
    }
    /**
     * 英雄列表，包含了阵型信息
     * @return {BattleHero[]}
     */
    get HeroList(){
        return this._HeroList;
    }

    /**
     * 坟场中的英雄总数
     */
    get ReBornCount(){
        let $ret = 0;
        for(let $k in this.HeroList){
            let $h = this.HeroList[$k];
            if ($h != null && $h.checkBuff(BattleBuffEnum.Dead)){
                $ret++;
            }
        }
        return $ret;
    }

    effect(){
        return this.effectMgr;
    }

    get id(){
        if (this.user != null) { 
            return this.user.player.id; 
        } 
        else {
            return 0;
        }
    }

    get Name(){
        if (this.room != null){
            return this.id == this.room.Attacker.id ? "我方" : "敌方";
        }
        else{
            return "";
        }
    }

    /**
     * @return {BattleUser}
     */
    get enemy(){
        let $ret = null;
        if (this.room != null){
            $ret = this.id == this.room.Attacker.id ? this.room.Defenser : this.room.Attacker;
        }
        return $ret;
    }

    IndexOf($x, $y){
        let $ret = null;

        let $sit = $x * 3 + $y;
        if(!!this.HeroList[$sit]){
            $ret = this.HeroList[$sit];
        }
        return $ret;
    }

    get Alive(){
        return this.TotalLife > 0;
    }

    get TotalLife(){
        let $ret = 0;
        for(let $k in this.HeroList){
            let $h = this.HeroList[$k];
            if ($h != null){
                $ret += $h.BattleParam.Defense;
            }
        }
        return $ret;
    }

    /**
     * 存活的英雄数量
     */
    get AliveHeroNum(){
        let $ret = 0;
        for (let $k in this.HeroList){
            let $h = this.HeroList[$k];
            if ($h != null && $h.BattleParam.Defense > 0){
                $ret += 1;
            }
        }
        return $ret;
    }

    /**
     * 牌组总的战力
     */
    get Power(){
        let $ret = 0;
        for (let $k in this.HeroList){
            let $h = this.HeroList[$k];
            if ($h != null){
                $ret += $h.BattleParam.Power;
            }
        }
        return $ret;
    }

    /**
     * 当前回合数，注意攻防双方所在回合数可能不同
     */
    get CountVersion(){
        return this._CountVersion;
    }

    /**
     * 刷新回合数
     */
    CalcCountVersion(){
        let $_add = true;
        for (let $hid in this.HeroList){
            let $h = this.HeroList[$hid];
            if ($h != null && $h.BattleParam.Defense > 0){
                $_add = $_add && $h.Action;
            }
        }
        if ($_add){
            //本回合所有的存活英雄都已经行动过，回合数递增
            this._CountVersion++;

            for (let $k in this.HeroList){
                let $h = this.HeroList[$k];
                if ($h != null){
                    $h.emit(EmitType.CountChange);
                }
            }
        }
    }

    /**
     * 获取下一个等待行动的英雄
     * @param {Boolean}  $change True 改变当前行动英雄 False 不改变当前行动英雄
     * @return {BattleHero} 等待行动的英雄
     */
    NextHero($change) {
        let $SiteNo = (this.CurrentSiteNo + 1) % 9;
        while (this.TotalLife > 0){
            if (this.HeroList[BattleUser.HeroOrderList[$SiteNo]] != null && this.HeroList[BattleUser.HeroOrderList[$SiteNo]].BattleParam.Defense > 0){
                if ($change){
                    this.HeroList[BattleUser.HeroOrderList[$SiteNo]].Action = true;
                    this.CurrentSiteNo = $SiteNo;
                }
                return this.HeroList[BattleUser.HeroOrderList[$SiteNo]];
            }

            if ($SiteNo == this.CurrentSiteNo){
                //已经循环了一圈, 但还是没有找到合适的行动者
                break;
            }

            $SiteNo = ($SiteNo + 1) % 9;
        }
        return null;
    }

    get CurHero() {
        return this.HeroList[BattleUser.HeroOrderList[this.CurrentSiteNo]];
    }

    /**
     * 判断并返回处于嘲讽/咆哮状态的英雄
     * @return {BattleHero} 
     */
    getPaoXiaoHero(){
        for (let $k in this.enemy.HeroList){
            let $h = this.enemy.HeroList[$k];
            if ($h != null && $h.BattleParam.Defense > 0 && $h.checkBuff(BattleBuffEnum.PaoXiao)){
                return $h;
            }
        }
        return null;
    }

    /// <summary>
    /// 获取一个空位
    /// </summary>
    /// <returns></returns>
    getTargetLocation($loc){
        for (let $i = 0; $i < 3; $i++){
            for (let $j = 0; $j < 3; $j++){
                let $sit = $i * 3 + $j;
                if (this.HeroList[$sit] == null && $loc.indexOf($sit.toString())!=-1) { return $sit; }
            }
        }
        return -1;
    }

    /**
     * 召唤指定编号的英雄
     * @param {int} hid     英雄编号
     * @param {int} $skill  附加技能
     * @return {BattleHero}
     */
    summon(hid, $skill=[]){
        let pet = this.user.player.core.ConfigMgr.PetList()[hid];
        if(!!pet){
            let $_SiteNo = this.getTargetLocation(pet.loc);
            if($_SiteNo != -1){
                this.HeroList[$_SiteNo] = BattleHero.CreateInstance(
                    this, 
                    $_SiteNo, 
                    pet, 
                    this.user.player.getPotentialMgr().GetHero(hid).getCardLevel(),
                    this.user.player.getPotentialMgr().GetHero(hid).getEnLevel() || 1, 
                    $skill
                );
                return this.HeroList[$_SiteNo];
            }
        }
        return null;
    }

    /**
     * 获取攻击锁定的目标英雄列表
     * @param {BattleHero}  $AttackHero  发起攻击的英雄
     * @param {*}  $mode        攻击方式
     * @return {BattleHero[]}
     */
    getTargetHeros($AttackHero, $mode){
        let $rList = [];
        let $ret = null;

        switch ($mode){
            case AttackMode.Hurt:
            {
                if(!!$AttackHero.HurtObject){
                    $rList.push($AttackHero.HurtObject.dst);
                }
            }
            break;

            case AttackMode.Me:
            {
                $rList.push($AttackHero);
            }
            break;

            case AttackMode.All:
            {
                for (let $k in this.enemy.HeroList){
                    let $h = this.enemy.HeroList[$k];
                    if ($h != null && $h.BattleParam.Defense > 0){
                        $rList.push($h);
                    }
                }
            }
            break;

            case AttackMode.Back:
            {
                let $_X = $AttackHero.X;
                for (let $i = 0; $i < 3; $i++){
                    for (let $j = 0; $j < 3; $j++){
                        if (this.enemy.IndexOf($_X, $j) != null && this.enemy.IndexOf($_X, $j).BattleParam.Defense > 0)
                        {
                            $ret = this.enemy.IndexOf($_X, $j);
                            break;
                        }
                    }
                    if ($ret != null)
                    {
                        break;
                    }

                    $_X = ($_X + 1) % 3;
                }

                if ($ret != null)
                {
                    $rList.push($ret);
                }
            }
            break;

            case AttackMode.RandomEnemy:
            {
                let s = [];
                for (let $k in this.enemy.HeroList){
                    let $h = this.enemy.HeroList[$k];
                    if ($h != null && $h.BattleParam.Defense > 0){
                        s.push($h);
                    }
                }
                return s.randomElement();
            }
            break;

            case AttackMode.RandomOur:
            {
                let s = [];
                for (let $k in this.HeroList){
                    let $h = this.HeroList[$k];
                    if ($h != null && $h.BattleParam.Defense > 0 && $h.id != $AttackHero.id){
                        s.push($h);
                    }
                }
                return s.randomElement();
            }
            break;

            case AttackMode.RandomEnemy3:
            {
                let s = [];
                for (let $k in this.enemy.HeroList){
                    let $h = this.enemy.HeroList[$k];
                    if ($h != null && $h.BattleParam.Defense > 0){
                        s.push($h);
                    }
                }
                return s.randomElement(3);
            }
            break;

            case AttackMode.RandomOur3:
            {
                let s = [];
                for (let $k in this.HeroList){
                    let $h = this.HeroList[$k];
                    if ($h != null && $h.BattleParam.Defense > 0 && $h.id != $AttackHero.id){
                        s.push($h);
                    }
                }
                return s.randomElement(3);
            }
            break;

            case AttackMode.Column:
            {
                let $_X = $AttackHero.X;
                let $isFind = false;
                for (let $i = 0; $i < 3; $i++){
                    for (let $j = 0; $j < 3; $j++){
                        if (this.enemy.IndexOf($_X, $j) != null && this.enemy.IndexOf($_X, $j).BattleParam.Defense > 0){
                            $isFind = true;
                        }
                        if ($isFind && this.enemy.IndexOf($_X, $j) != null && this.enemy.IndexOf($_X, $j).BattleParam.Defense > 0){
                            $rList.push(this.enemy.IndexOf($_X, $j));
                        }
                    }
                    if ($isFind) { break; }

                    $_X = ($_X + 1) % 3;
                }
            }
            break;

            case AttackMode.Head:
            {
                let $_X = $AttackHero.X;
                for (let $i = 0; $i <= 2; $i++){
                    for (let $j = 2; $j >= 0; $j--){
                        if (this.enemy.IndexOf($_X, $j) != null && this.enemy.IndexOf($_X, $j).BattleParam.Defense > 0){
                            $ret = this.enemy.IndexOf($_X, $j);
                            break;
                        }
                    }
                    if ($ret != null){
                        break;
                    }

                    $_X = ($_X + 1) % 3;
                }

                if ($ret != null){
                    $rList.push($ret);
                }
            }
            break;

            case AttackMode.Row:
            {
                let $isFind = false;
                for (let $j = 2; $j >= 0; $j--){
                    for (let $i = 0; $i < 3; $i++){
                        if (this.enemy.IndexOf($i, $j) != null && this.enemy.IndexOf($i, $j).BattleParam.Defense > 0){
                            $isFind = true;
                        }
                        if ($isFind && this.enemy.IndexOf($i, $j) != null && this.enemy.IndexOf($i, $j).BattleParam.Defense > 0){
                            $rList.push(this.enemy.IndexOf($i, $j));
                        }
                    }
                    if ($isFind) { break; }
                }
            }
            break;

            case AttackMode.Confusion:
            {//混乱攻击
                let $ret = this.NextHero(false);
                if ($ret != null){//寻找下一个友军发起攻击
                    $rList.push($ret);
                }
                else {//如果找不到合适的英雄，向敌方发起攻击
                    return this.getTargetHeros($AttackHero, AttackMode.Head);
                }
            }
            break;

            case AttackMode.Single:
            {
                let $ret = this.NextHero(false);
                if ($ret != null){
                    $rList.push($ret);
                }
            }
            break;

            case AttackMode.Counter:
            {
                if ($AttackHero.HurtObject != null && $AttackHero.HurtObject.src.BattleParam.Defense > 0){
                    $rList.push($AttackHero.HurtObject.src);
                }
            }
            break;

            case AttackMode.Our:
            {
                for (let $k in this.HeroList){
                    let $h = this.HeroList[$k];
                    if ($h != null && $h.BattleParam.Defense > 0){
                        $rList.push($h);
                    }
                }
            }
            break;

            case AttackMode.ReBorn:
            {
                for (let $k in this.HeroList){
                    let $h = this.HeroList[$k];
                    if ($h != null && $h.BattleParam.Defense == 0){
                        $rList.push($h);
                        break;
                    }
                }
            }
            break;
        }
        return $rList;
    }
}
BattleUser.HeroOrderList = [8, 5, 2, 7, 4, 1, 6, 3, 0];

exports = module.exports = BattleUser;
