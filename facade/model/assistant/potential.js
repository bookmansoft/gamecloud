let facade = require('../../../facade/Facade')
let {RarityType, PurchaseType, em_Condition_Checkmode, em_Condition_Type, PotentialType, ResType, ActionType, ActionStatus, em_Effect_Comm, ReturnCode} = facade.const
let ActionOfTimer = require('../../util/potential/ActionOfTimer')
let ConfigManager = require('../../util/potential/ConfigManager')
let PotentialItem = require('../../util/potential/PotentialItem')
let EffectManager = require('../../../facade/util/comm/EffectManager')
let UserEntity = facade.entities.UserEntity
let baseMgr = require('../baseAssistant')
let LargeNumberCalculator = require('../../../facade/util/comm/LargeNumberCalculator') 

/**
 * 天赋管理对象，管理内容包括：
 * 1、法宝的召唤、升级、加点：消耗金币和圣光。使用初始价格激活法宝，之后使用公式计算法宝升级所需金币。
 * 2、图腾的召唤、升级：消耗魂石
 *
 * @todo
 * 1、之前的设计方案中，只保存基础数据，效果是实时计算的，而战斗力等最终数值是根据基础数据（如等级）+ 效果推算出来的，这导致了大量的重复计算量，影响到了系统响应能力
 */
class potential extends baseMgr
{
    /**
     * 
     * @param {UserEntity} parent 
     */
    constructor(parent){
        super(parent, 'potential');

        /**
         * 天赋（法宝）对象列表 map<int, PotentialItem> equList
         * 记录所有已解锁的天赋对象列表
         * @var
         */
        this.equList = {};
        /**
         * 图腾列表
         * @var array
         */
        this.totemList = {};
        /**
         * PVE伙伴列表
         * @var array
         */
        this.cpetList = {};
        /**
         * PVP伙伴（英雄）列表
         * @var array
         */
        this.heroList = {};
        /**
         * 时效性技能管理
         * @var array
         */
        this.actions = {};

        /**
         * 当前激活的宠物编号
         * @var int
         */
        this.cpetActiveId = 1;
        /**
         * 当前宠物的统一等级
         * @var int
         */
        this.cpetLevel = 0;
        this.stone = 0;
        /**
         * 目前可以使用的宠物万能碎片
         * @var int
         */
        this.chip = 0;
        /**
         * 当前激活的宠物编号
         * @var int
         */
        this.petActiveId = 0;
    
        /**
         * 英雄编组信息
         * @var array
         */
        this.heroLoc = {
            1: [],
            2: [],
            3: [],
            4: [],
            5: []
        };

        this.eMgr = null;
    }
    
    /**
     * 反序列化之前持久化的内容
     * @param $potential
     */ 
    LoadData($potential) {
        //时效性技能
        for(let $key in ConfigManager.getActionConfig()){
            let $p = new ActionOfTimer($key);
            this.actions[$p.id] = $p;
        }

        if($potential != null && $potential != '') {
            this.totemList = {};
            this.equList = {};
            this.heroList = {};

            let $ps = $potential.split('|');
            if($ps.length > 0){
                for(let $value of $ps[0].split(';')) {
                    let $params = $value.split(',');

                    if($params.length >= 3){
                        let $pi = new PotentialItem(PotentialType.Equ);
                        $pi.id = $params[0];
                        $pi.setLevel($params[1]);
                        $pi.setPoint($params[2]);

                        this.equList[$pi.id] = $pi;
                    }
                }
            }
            if($ps.length > 1){
                for(let $value of $ps[1].split(';')){
                    let $params = $value.split(',');

                    if($params.length >= 3){
                        let $pi = new PotentialItem(PotentialType.Totem);
                        $pi.id = $params[0];
                        $pi.setLevel($params[1]);
                        $pi.setPoint($params[2]);

                        this.totemList[$pi.id] = $pi;
                    }
                }
            }
            if($ps.length > 2){
                for(let $value of $ps[2].split(';')) {
                    let $params = $value.split(',');

                    if($params.length >= 5){
                        let $pi = new PotentialItem(PotentialType.Pet);
                        $pi.id = $params[0];
                        $pi.setLevel($params[1]);
                        $pi.setPoint($params[2]);
                        $pi.setEnLevel($params[3]);
                        $pi.setAdLevel($params[4]);

                        this.heroList[$pi.id] = $pi;
                    }
                    else if($params.length == 1){//当前激活宠物ID
                        this.petActiveId = $params[0];
                    }
                }
            }
            if($ps.length > 3){
                this.heroLoc = JSON.parse($ps[3]);
            }

            if($ps.length > 4){
                for(let $value of $ps[4].split(';')) {
                    let $params = $value.split(',');

                    if($params.length >= 4){
                        let $pid = $params[0];
                        if(!!this.actions[$pid]){
                            this.actions[$pid].num = parseInt($params[1]);
                            this.actions[$pid].cd = parseInt($params[2]);
                            this.actions[$pid].status = parseInt($params[3]);
                        }
                    }
                }
            }

            if($ps.length > 5){//PVE伙伴
                for(let $value of $ps[5].split(';')) {
                    let $params = $value.split(',');

                    if($params.length >= 4){//单个PVE伙伴的参数
                        let $pi = new PotentialItem(PotentialType.CPet);
                        $pi.id = $params[0];
                        $pi.setLevel($params[1]);//PVE伙伴的等级
                        if($pi.id == 1 && $pi.getLevel() == 0){
                            $pi.setLevel(1);//编号为1的PVE伙伴，强制激活
                        }
                        $pi.setPoint($params[2]);   //原来存储专属碎片，目前作为保留字段
                        $pi.setAdLevel($params[3]); //PVE伙伴的进阶等级

                        this.cpetList[$pi.id] = $pi;
                    }
                    else if($params.length == 1){//当前激活PVE伙伴ID、当前PVE伙伴等级等扩展参数
                        let $ss = $params[0].split('@');
                        this.cpetActiveId = $ss[0];
                        if($ss.length > 1){
                            this.cpetLevel = parseInt($ss[1]);
                        }
                    }
                }
            }
        }
        this.CheckTech(); //检测科技、重新计算科技效果
        this.CheckPet();  //检测、添加宠物
        this.CheckCPet(); //检测、添加PVE伙伴
    }

    /**
     * 序列化
     * @return string
     */
    ToString() {
        let $ret = '';
        for(let $key in this.equList){
            let $value = this.equList[$key];
            if($ret != ''){
                $ret += ';';
            }
            $ret += $value.id + ',' + $value.getLevel() + ',' + $value.getPoint();
        }

        let $ret1 = '';
        for(let $key in this.totemList){
            let $value = this.totemList[$key];
            if($ret1 != ''){
                $ret1 += ';';
            }
            $ret1 += $value.id + ',' + $value.getLevel() + ',' + $value.getPoint();
        }

        let $ret2 = '';
        for(let $key in this.heroList){
            let $value = this.heroList[$key];
            if($ret2 != ''){
                $ret2 += ';';
            }
            $ret2 += $value.id + ',' + $value.getLevel() + ',' + $value.getPoint() + ',' + $value.getEnLevel() + ',' + $value.getAdLevel();
        }
        $ret2 += ';' + this.petActiveId; //激活宠物ID
        
        let $ret3 = JSON.stringify(this.heroLoc);
        let $ret4 = '';
        for(let $key in this.actions){
            let $value = this.actions[$key];
            if($ret4 != ''){
                $ret4 += ';';
            }
            $ret4 += $value.id + ',' + $value.num + ',' + $value.cd + ',' + $value.status;
        }

        let $ret5 = '';
        for(let $key in this.cpetList){
            let $value = this.cpetList[$key];
            if($ret5 != ''){
                $ret5 += ';';
            }
            $ret5 += $value.id + ',' + $value.getLevel() + ',' + $value.getPoint() + ',' + $value.getAdLevel();
        }
        $ret5 += ';' + this.cpetActiveId + '@' + this.cpetLevel; //激活PVE伙伴ID、PVE伙伴的统一等级

        return $ret + '|' + $ret1 + '|' + $ret2 + '|' + $ret3 + '|' + $ret4 + '|' + $ret5;
    }

	//#region 法宝相关功能

    /**
     * 获取所有法宝的总战斗力
     * @return {LargeNumberCalculator}
     */
    getPower() {
        let $ret = new LargeNumberCalculator(0, 0);

        //计算所有法宝战力之和，包括圣光基础加成
        for(let $key in this.equList){
            let $value = this.equList[$key];
            $ret._add_($value.getPower());
        }

        return $ret;
    }

    /**
     * 获取当前激活的PVE宠物的点击攻击力
     * @return {LargeNumberCalculator}
     */
    getClickPower() {
        if(!!this.cpetList[this.cpetActiveId]){
            return this.cpetList[this.cpetActiveId].getPower();
        }
        else{
            return new LargeNumberCalculator(0, 0);
        }
    }

    /**
     * 添加天赋点
     * @param {UserEntity} $user
     * @param {Number} $_point
     * @param {Number} $id 为0表示购买圣光，为1表示在圣光池和天赋对象间转移
     */
    AddPoint($user, $_point, $id = 0) {
        if($id > 0){
            if(!!this.equList[$id]){
                //修改天赋对象上的圣光数量，$_point>0表示移除，<0表示添加
                this.equList[$id].setPoint(Math.max(0, this.equList[$id].getPoint() - $_point)); 
                if(this.eMgr != null){
                    this.eMgr.SetEffectChanged(); //设置效果变化标志
                }
                this.dirty = true;

                //修改背包中天赋点数量，$_point>0表示添加，<0表示移除
                $user.getPocket().AddRes($_point, true, ResType.Potential);
            }
        }
        else {
            //购买圣光，添加到背包
            $user.getBonus({type:ResType.Potential, num:$_point});
        }
    }

    /**
     * 为一个随机天赋添加圣光点数
     * @param {UserEntity} $user
     * @param {Number} $pm 要添加的点数数值
     * @return {Object} 选中的天赋编号
     */
    AssignPoint($user, $pm = 1) {
        let $ret = {};
        while(($user.getPocket().GetRes(ResType.Potential) > 0) && ($pm-- > 0)){
            let $key = Object.keys(this.equList).randomElement();
            if(!!$key){
                this.AddPoint($user, -1, this.equList[$key].id);
                if(!!$ret[this.equList[$key].id]){
                    $ret[this.equList[$key].id] += 1;
                }
                else{
                    $ret[this.equList[$key].id] = 1;
                }
            }
        }
        return $ret;
    }

    /**
     * 一次性分配全部多余的天赋点数
     * @param {UserEntity} $user
     */
    AssignAllPoint($user)
    {
        return this.AssignPoint($user, $user.getPocket().GetRes(ResType.Potential));
    }

    /**
     * 指定一个天赋，扣减其若干点数，随机添加到另外一个天赋上
     * @param int $id
     * @param int $pm
     * @return array
     */
    ReAssignPoint($user, $id, $pm = 1) {
        if(!!this.equList[$id]){
            //数值合法性检查
            $pm = Math.min(this.equList[$id].getPoint(), $pm);

            //将法宝上已分配的圣光“加”到闲置圣光池中
            this.AddPoint($user, $pm, $id);

            //扣减成功 再次随机分配
            return this.AssignPoint($user, $pm);
        }
        return {};
    }

    /**
     * 返回指定法宝上已分配圣光数量
     * @param int $id
     * @return int
     */
    getPoint($id) {
        if(!!this.equList[$id]){
            return this.equList[$id].getPoint();
        }
        return 0;
    }

    /**
     * 升级天赋，如果对0级天赋升级，视为激活
     *
     * @param {UserEntity} $user 执行操作的用户
     * @param int $id 要升级的天赋编号
     * @param int $added 要升级的总级数
     * @return int 操作结果码
     */
    UpgradeTech($user, $id, $added = 1) {
        if(!!this.equList[$id]){
            let $oriValue = this.equList[$id].getLevel();
            if($oriValue == 0){
                $added = 1; //如果天赋等级为0，则本次只能升1级，视为激活操作
            }
            //计算升级费用
            let $requireMoney = this.getUpgradeRequiredMoney($id, $oriValue, $added)
                .CalcFinallyValue($user.effect(), [em_Effect_Comm.MoneyConsumeDiscount]);

            if(!$user.getPocket().ResEnough($requireMoney, ResType.Gold)) {//检测金币是否足够
                return ReturnCode.NotEnough_Money;
            }

            this.equList[$id].setLevel($oriValue + $added);
            //任务条件发生变化
            $user.getTaskMgr().Execute(em_Condition_Type.equUpgrade, $added, em_Condition_Checkmode.add);
            if(this.equList[$id].getLevel() == 1){//这是一次激活操作，做一次附加的科技树检测
                this.CheckTech();
            }
            this.dirty = true; //设置脏数据标志
            if(this.eMgr != null){
                this.eMgr.SetEffectChanged(); //设置效果变化标志
            }
    
            //变为负值以进行扣费
            $user.getPocket().AddRes($requireMoney._mul_(-1), true, ResType.Gold);
            return ReturnCode.Success;
        }
        else{
            return ReturnCode.paramError;
        }
    }

    /**
     * 重生时，将所有法宝等级归一
     * @return int
     */
    RevivalTech() {
        for(let $key in this.equList){
            this.equList[$key].setLevel(0);
        }
        this.CheckTech();
        this.dirty = true; //设置脏数据标志
        if(this.eMgr != null){
            this.eMgr.SetEffectChanged(); //设置效果变化标志
        }
        return ReturnCode.Success;
    }

    /**
     * 重新检测科技树
     */
    CheckTech() {
        let $isChange = false;
        //检测现有科技是否有不满足激活条件的，从列表中去除
        let $l = ConfigManager.getList();
        for(let $key in this.equList){
            let $value = this.equList[$key];
            if(!$l[$value.id]/*科技不存在*/
                || ($l[$value.id]['pre_tech_id'] > 0 &&
                    (!this.equList[$l[$value.id]['pre_tech_id']] ||
                        /*前置科技不满足*/this.equList[$l[$value.id]['pre_tech_id']].getLevel() < $l[$value.id]['pre_tech_lv'])))
            {
                $isChange = true;
                if($value.getPoint() <= 0){
                    delete this.equList[$key];
                }
                else{//已经有圣光分配的不能移除,只是将等级置零
                    this.equList[$key].setLevel(0);
                }
            }
        }

        //检测是否有新增的技能，添加到技能列表中
        for(let $key in $l){
            let $value = $l[$key];
            if(!this.equList[$value['id']]) {//尚未添加
                if($value['pre_tech_id'] <= 0 || ( !!this.equList[$value['pre_tech_id']] && this.equList[$value['pre_tech_id']].getLevel() >= $value['pre_tech_lv']))
                {//满足前置天赋条件
                    //添加新的天赋技能
                    let $pi = new PotentialItem(PotentialType.Equ);
                    $pi.id = $value['id'];
                    $pi.setLevel(0);

                    this.equList[$pi.id] = $pi;

                    if(!!this.eMgr){
                        this.eMgr.SetEffectChanged(); //设置效果变化标志
                    }
                }
            }
        }
    }

    /**
     * 返回天赋技能列表的引用 map<unsigned short, PotentialItem>
     *
     * @return array
     */
    GetList() {
        return this.equList;
    }

    /**
     * 
     * @param {*}  
     * @param {*}  
     * @param {*}  
     * @return {LargeNumberCalculator}
     */
    getUpgradeRequiredMoney($id, $lv1, $added) {
        return ConfigManager.getCost($id, $lv1, $added);
    }

    //#endregion

	//#region 图腾相关功能

    /**
     * 目前可以使用的魂石数量
     * @var int
     */
    CanActiveTotem($id) {
        if(!ConfigManager.getTotemList()[$id]){
            return false;
        }

        //检测图腾激活条件
        for(let $condition of ConfigManager.getTotemList()[$id]['active']){
            if(!this.heroList[$condition.id] || this.heroList[$condition.id].getEnLevel() < $condition.value) {
                return false;
            }
        }

        return true;
    }

    /**
     * 激活或升级图腾
     * @param {UserEntity} $user
     * @param int $id
     * @param int $added
     * @return int
     */
    UpgradeTotem($user, $id, $added = 1) {
        let $oriLevel = 0;
        if(!this.totemList[$id]) {
            if(!!ConfigManager.getTotemList()[$id]){//激活操作
                $added = 1; //本次为激活操作
            }
            else{
                return ReturnCode.paramError;
            }
        }
        else{
            $oriLevel = this.totemList[$id].getLevel();
        }

        //新增：最大等级判断
        let $ml = ConfigManager.getTotemList()[$id]['max'];
        if($ml > 0 && $oriLevel + $added > $ml){
            return ReturnCode.Level_Limited;
        }
        //End

        let $requireStone = ConfigManager.getCostStone($id, $oriLevel, $added, Object.keys(this.totemList).length); //计算费用
        if($user.getPocket().GetRes(ResType.StoneHero) < $requireStone){
            return ReturnCode.NotEnough_Num;
        }

        if($oriLevel == 0){
            //2016.12.11 新增：添加关联魔宠激活判定
            if(this.CanActiveTotem($id)){
                let $newItem = new PotentialItem(PotentialType.Totem);
                $newItem.id = $id;

                this.totemList[$id] = $newItem;
            }
            else{
                return ReturnCode.CanntActive;
            }
        }

        //负值扣费
        $user.getBonus({type:ResType.StoneHero, num:-$requireStone});
        
        this.totemList[$id].setLevel($oriLevel + $added);
        //任务条件发生变化
        $user.getTaskMgr().Execute(em_Condition_Type.totemUpgrade, $added, em_Condition_Checkmode.add);
        this.dirty = true;
        if(!!this.eMgr){
            this.eMgr.SetEffectChanged(); //设置效果变化标志
        }

        return ReturnCode.Success;
    }

    /**
     * 计算图腾升级消耗（魂石）
     */
    CalcTotemCost() {
        for(let $key in this.totemList){
            let $value = this.totemList[$key];
            $value.setMoney(new LargeNumberCalculator(ConfigManager.getCostStone($value.id, $value.getLevel(), 25, Object.keys(this.totemList).length), 0));
        }
    }

    /**
     * 获取随机的、可供激活操作的图腾列表
     * @return array
     */
    GetRandomTotemList($n) {
        let $list = ConfigManager.getTotemList();
        let $l = Object.keys($list).reduce((sofar,cur)=>{
            if(!this.totemList[$list[cur]['id']]){
                sofar.push($list[cur]);
            }
            return sofar;
        }, []);
        return $l.randomElement($n).map($item => {
            let $ret = new PotentialItem(PotentialType.Totem);
            $ret.id = $item['id'];
            let cos = ConfigManager.getCostStone($item['id'], 0, 1, Object.keys(this.totemList).length);
            $ret.setMoney(new LargeNumberCalculator(cos, 0));
            return $ret;
        });
    }

    /**
     * 返回图腾列表
     * @return array
     */
    GetTotemList() {
        return this.totemList;
    }

    //#endregion

    //#region PVP伙伴相关操作
    GetHeroList() {
        return this.heroList;
    }

    /**
     * 获取英雄对象
     * @param {*}  
     */
    GetHero($id){
        return this.heroList[$id];
    }

    /**
     * PVP宠物升级
     * @param {UserEntity} $user
     * @param int $id
     * @param int $added
     * @return int
     */
    UpgradeHero($user, $id, $added =1) {
        if(!this.heroList[$id]) {
            return ReturnCode.paramError;
        }

        if(0 == this.heroList[$id].getEnLevel()){
            return ReturnCode.petActiveNotStart;//如果没有激活则不能升级
        }

        let $oriLevel = this.heroList[$id].getLevel();

        //最大升级级数99级，且不能大于当前星级*20
        if($oriLevel + $added > Math.min(99, this.heroList[$id].getEnLevel()*20)){
            return ReturnCode.roleMaxLevel; //已达当前可升最大等级
        }

        let $reqChip = ConfigManager.getPetList()[$id].upgrade;
        let $num = $reqChip.calc(this.heroList[$id].getLevel() + $added);
        if($user.getPocket().GetRes($reqChip.type, $reqChip.id) >= $num){//万能碎片
            $user.getPocket().AddRes(-$num, true, ResType.chip);
        }
        else{
            return ReturnCode.Hero_NotEnough_UpgradeChip;
        }

        this.heroList[$id].setLevel($oriLevel + $added);
        this.dirty = true;
        if(this.eMgr != null){
            this.eMgr.SetEffectChanged(); //设置效果变化标志
        }

        return ReturnCode.Success;
    }

    /**
     * 宠物强化
     * @param IUser $user
     * @param int $id
     * @param int $added
     * @return int
     */
    EnhanceHero($user, $id, $added =1) {
        if(!!this.heroList[$id]) {
            if(0 == this.heroList[$id].getEnLevel()){
                $added = 1; //如果强化等级为0，则视为激活操作
            }

            if(ConfigManager.getPetList()[$id]['max'] < this.heroList[$id].getEnLevel() + $added){
                return ReturnCode.Level_Limited;//超过最大等级限制
            }

            //升星最大等级：最低3，最高等于当前品质等级
            if(this.heroList[$id].getEnLevel() + $added > Math.max(3, this.heroList[$id].getAdLevel())){
                return ReturnCode.roleMaxLevel;
            }

            let $reqChip = ConfigManager.getPetList()[$id].enhance;
            let $num = $reqChip.calc(this.heroList[$id].getEnLevel() + $added);
            if($user.getPocket().GetRes($reqChip.type, $reqChip.id) >= $num){
                $user.getPocket().AddRes(-$num, false, $reqChip.type, $id);
            }
            else{
                return ReturnCode.Hero_NotEnough_EnhanceChip;
            }

            if(0 == this.heroList[$id].getEnLevel()){//如果强化等级为0，则将初始等级设为1
                this.heroList[$id].setLevel(1);
            }
            this.heroList[$id].setEnLevel(this.heroList[$id].getEnLevel() + $added); //提升宠物强化等级
            this.dirty = true;
            if(this.eMgr != null){
                this.eMgr.SetEffectChanged(); //设置效果变化标志
            }
    
            return ReturnCode.Success;
        }
        else{
            return ReturnCode.paramError;
        }
    }

    /**
     * 神魔进阶
     * @param IUser $user
     * @param int $id
     * @param int $added
     * @return int
     */
    AdvanceHero($user, $id, $added =1) {
        if(!this.heroList[$id])
        {
            return ReturnCode.paramError;
        }

        if(0 == this.heroList[$id].getEnLevel()){
            return ReturnCode.petActiveNotStart;//如果没有激活则不能升级
        }

        if(this.heroList[$id].getAdLevel() + $added > RarityType.Lv5){
            return ReturnCode.roleMaxLevel;
        }

        let $reqChip = ConfigManager.getPetList()[$id].advance;
        let $num = $reqChip.calc(this.heroList[$id].getAdLevel() + $added);
        if($user.getPocket().GetRes($reqChip.type, $reqChip.id) >= $num){
            $user.getPocket().AddRes(-$num, true, ResType.advancedChip);
        }
        else{
            return ReturnCode.Hero_NotEnough_AdvChip;
        }

        this.heroList[$id].setAdLevel(this.heroList[$id].getAdLevel() +  $added);
        this.dirty = true;

        if(this.eMgr != null){
            this.eMgr.SetEffectChanged(); //设置效果变化标志
        }

        return ReturnCode.Success;
    }

    /**
     * 将各种神魔原型加入PVP宠物列表
     */
    CheckPet() {
        let $pl = ConfigManager.getPetList();
        Object.keys($pl).reduce((sofar,cur)=>{
            let $item = $pl[cur];
            if(!this.heroList[$item['id']]){ //将未激活的神魔原型加入列表
                sofar.push($item);
            }
            return sofar;
        }, []).map($it=>{
            let $pi = new PotentialItem(PotentialType.Pet);
            $pi.id = parseInt($it['id']);
            $pi.setPoint(0);
            if($pi.id == 1){//默认激活孙悟空
                $pi.setLevel(1);                //设定初始等级
                $pi.setEnLevel(1);              //设定初始星级
                $pi.setAdLevel($it['rtype']);   //设定初始品质
                this.dirty = true;
            }
            else{
                $pi.setLevel(0);                //设定初始等级
                $pi.setEnLevel(0);              //设定初始星级
                $pi.setAdLevel($it['rtype']);   //设定初始品质
            }

            this.heroList[$pi.id] = $pi;
        });
    }

    /**
     * 设定指定编组的英雄占位，这些英雄不能出现在其他编组中
     * @param {Number} $gid 1~5
     * @param {String} $info
     * @return bool
     */
    setLocArray($gid, $info) {
        if(!!this.heroLoc[$gid]){ //指定的编组ID合法
            let $hl = [];
            for(let $id of $info.split(',')){
                //只保留激活状态的英雄, 过滤编号为1的英雄（主角悟空）
                if($id != 1 && !!this.heroList[$id] && this.heroList[$id].getEnLevel() > 0){
                    $hl.push($id);
                }
            }
            if($hl.length <= 10 && $hl.length > 0){ //编组大小介乎1~10之间
                let $diff = [];
                for(let $key in this.heroLoc){
                    let $value = this.heroLoc[$key];
                    if($key != $gid){
                        $diff.push($value);
                    }
                }
                if($hl.length == $hl.array_diff(...$diff).length){ //该卡组中的英雄，都不在其他卡组中，也就是不存在重复编制
                    if($hl.filter(id=>ConfigManager.getPetList()[id].profession != 0).length <= 3){ //英雄卡的数量不超过3张
                        this.heroLoc[$gid] = $hl;
                        this.dirty = true; //设置数据保存标志
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * 返回英雄编组信息
     * @return array
     */
    getLocArray($gid) {
        let $ret = [];
        if(!!this.heroLoc[$gid]){
            return this.heroLoc[$gid];
        }
        return $ret;
    }

    /**
     * 返回全部编组信息
     */
    getLocArrayList(){
        return this.heroLoc;
    }

    saveLocarray($gid, $loc){
        this.heroLoc[$gid] = $loc;
        this.dirty = true;
    }
    //#endregion

    //#region 时效性技能管理
    /**
     * 执行时效性技能
     * @param int $id
     * @return int
     */
    Action($id) {
        let $ret = ReturnCode.paramError;
        if(!!this.actions[$id]){
            $ret = this.actions[$id].Execute(this.parent, true);
            if(this.actions[$id].isDarty){
                this.dirty = true;
            }
        }

        return $ret;
    }

    /**
     * 获取指定ID对应的时效技能对象
     * @param int $id
     * @return ActionOfTimer
     */
    ActionById($id) {
        if(!!this.actions[$id]){
            return this.actions[$id];
        }
        return null;
    }

    /**
     * 消除技能CD，规则如下：
     * 1、如果元宝不足，返回NotEnough_Diamond
     * 2、只要有一个action处于cd状态，就会扣费并消除其cd
     * 3、如果所有action都未处于cd状态，则不会扣费，直接返回操作成功
     * @param {UserEntity} $user
     * @return {int}
     */
    ActionClearCd($user) {
        this.Actions($user);
        if($user.purchase(PurchaseType.clearCd, 1, false)){
            for(let $key in this.actions){
                let $item = this.actions[$key];
                if($item.status == ActionStatus.CollDown){
                    this.dirty = true; //！必须设置，否则状态得不到保存
                    $item.status = ActionStatus.Normal;
                    $item.cd = facade.util.now();
                    $user.purchase(PurchaseType.clearCd, 1, true);
                }
            }
            return ReturnCode.Success;
        }
        else{
            return ReturnCode.NotEnough_Diamond;
        }
    }

    /**
     * 增加时效性技能的可使用数量, 或者消除指定技能的CD
     * @param int $id 技能ID
     * @param int $num 希望增加的数量
     * @return int 结果码
     */
    ActionAdd($id, $num) {
        if(!ConfigManager.getActionConfig()[$id]){
            return ReturnCode.paramError;
        }

        if(!this.actions[$id]){
            this.actions[$id] = new ActionOfTimer($id);
        }
        let $ret = this.actions[$id].Add($num);
        if(ReturnCode.Success == $ret){
            this.dirty = true;
        }
        return $ret;
    }

    /**
     * 列表显示所有时效性技能
     * @param IUser $user
     * @return array
     */
    Actions($user) {
        for(let $key in this.actions){
            let $item = this.actions[$key];
            $item.Execute($user);
            this.dirty = this.dirty || $item.isDarty;
        }
        return this.actions;
    }

    //#endregion

    //#region 效果管理接口

    /**
     * 效果管理器：
     * 1、纪录影响天赋内部属性的效果，例如“增加自身攻击力50%”，直接用于攻击力的计算
     * 2、管理会影响外部属性的效果，例如“增加暴击率”，以便外部对象合并使用
     * @param int $type
     * @return {EffectManager}
     *
     * @note 目前已合并计算法宝、图腾、PVE宠物的效果
     */
    effect($nl = 0)
    {
        let $isChange = false;
        if(this.eMgr != null){
            for(let $key in this.equList){
                let $value = this.equList[$key];
                $isChange = $isChange || $value.effect().GetEffectChanged();
                if($isChange){ break; }
            }
            if($isChange == false){
                for(let $key in this.totemList){
                    let $value = this.totemList[$key];
                    $isChange = $isChange || $value.effect().GetEffectChanged();
                    if($isChange){ break; }
                }
            }
            if($isChange == false){
                for(let $key in this.cpetList){
                    let $value = this.cpetList[$key];
                    $isChange = $isChange || $value.effect().GetEffectChanged();
                    if($isChange){ break; }
                }
            }
        }

        if($isChange == true || this.eMgr == null){
            this.eMgr = new EffectManager();

            //重新计算效果 消除下级效果器的变化标志
            for(let $key in this.equList){
                let $value = this.equList[$key];
                this.eMgr.Add($value.effect().SetEffectChanged(false));
            }
            for(let $key in this.totemList){
                let $value = this.totemList[$key];
                this.eMgr.Add($value.effect().SetEffectChanged(false));
            }
            if(!!this.cpetList[this.cpetActiveId]){//只计算当前激活宠物的技能效果
                this.eMgr.Add(this.cpetList[this.cpetActiveId].effect().SetEffectChanged(false));
            }
            //设置自身效果器的变化标志，以便上级效果器感知到变化
            this.eMgr.SetEffectChanged();
        }
        return this.eMgr;
    }
    
    GetCPetList() {
        return this.cpetList;
    }

    /**
     * PVE伙伴升级
     * @param {UserEntity} $user
     * @param {Number} $added
     * @return {Number}
     */
    UpgradeCPet($user, $added =1) {
        $added = Math.max(1, $added);
        let $requireMoney = LargeNumberCalculator.Load(ConfigManager.getCostCPet(this.cpetLevel, $added));
        if(!$user.getPocket().ResEnough($requireMoney, ResType.Gold)){
            return ReturnCode.NotEnough_Money;
        }
        $user.getPocket().AddRes($requireMoney._mul_(-1), true, ResType.Gold);//变为负值扣费

        this.cpetLevel += $added;
        //登记任务条件发生变化
        $user.getTaskMgr().Execute(em_Condition_Type.cpetUpgrade, $added, em_Condition_Checkmode.add);
        //全部升级
        for(let $key in this.cpetList){
            let $value = this.cpetList[$key];
            if(this.isCPetActived($key)){
                this.cpetList[$key].setLevel(this.cpetLevel);
            }
        }
        this.dirty = true;

        return ReturnCode.Success;
    }

    /**
     * 切换PVE伙伴上场
     * @param IUser $user
     * @param int $id
     * @return int
     */
    PerformCPet($user, $id) {
        if(!!this.cpetList[$id] && this.cpetList[$id].getLevel() > 0){
            this.cpetActiveId = $id;
            this.dirty = true;

            //由于宠物切换导致技能发生了变化
            if(!!this.cpetList[$id].eMgr){
                this.cpetList[$id].eMgr.SetEffectChanged();
            }

            return ReturnCode.Success;
        }
        else{
            return ReturnCode.itemNotExist;
        }
    }

    /**
     * 重生时，所有PVE伙伴等级归一
     */
    RevivalCPet() {
        for(let $key in this.cpetList){
            let $pet = this.cpetList[$key];
            if($pet.level != 0) $pet.setLevel(1); 
        }
        this.dirty = true;
        if(this.eMgr != null){
            this.eMgr.SetEffectChanged(); //设置效果变化标志
        }
        return ReturnCode.Success;
    }

    /**
     * 检测指定碎片对应的PVE伙伴项是否已激活
     * @param {Number} $tid
     * @return {Boolean}
     */
    isCPetActivedByTypeId($tid) {
        if(!!this.cpetList[$tid] && this.cpetList[$tid].getLevel() > 0){
            return true;
        }
        return false;
    }

    /**
     * 检测指定PVE伙伴是否激活
     * @param int $cpetId
     * @return bool
     */
    isCPetActived($cpetId) {
        if(!!this.cpetList[$cpetId] && this.cpetList[$cpetId].getLevel() > 0){
            return true;
        }
        return false;
    }

    /**
     * 激活指定PVE伙伴
     * @param {Number} $id          指定激活的PVE伙伴ID
     * @param {Boolean} checkChip   是否检测碎片
     * @return {Number}
     */
    ActiveCPet($id, checkChip = true) {
        if(!!this.cpetList[$id]){
            let $pet = this.cpetList[$id];
            if($pet.getLevel() == 0){
                if(checkChip){
                    let $req = ConfigManager.getFellowList()[$id].activeInfo;
                
                    if(this.parent.getPocket().GetRes($req.type, $req.id) < $req.num) {
                        return ReturnCode.NotEnough_Chip;
                    }
                    this.parent.getPocket().AddRes(-$req.num, false, $req.type, $req.id);
                }

                this.dirty = true;
                $pet.setLevel(1);
                if(this.cpetLevel <= 0){
                    this.cpetLevel = 1;
                }
                return ReturnCode.Success;
            }
        }
        return ReturnCode.paramError;
    }

    /**
     * 进阶PVE伙伴
     * @param IUser $user
     * @param int $id
     * @param int $added
     * @return int
     */
    AdvanceCPet($user, $id, $added =1) {
        if(!this.cpetList[$id]) {
            return ReturnCode.paramError;
        }
        
        let $pet = this.cpetList[$id];

        let $req = ConfigManager.getAdvanceCChip($id, $pet.getAdLevel(), $added);
        if(this.parent.getPocket().GetRes($req.type, $req.id) < $req.num){
            return ReturnCode.NotEnough_Chip;
        }
        else{
            this.parent.getPocket().AddRes(-$req.num, false, $req.type, $req.id);
        }

        $pet.setAdLevel($pet.getAdLevel() +  $added);

        this.dirty = true;
        if(this.eMgr != null){
            this.eMgr.SetEffectChanged(); //设置效果变化标志
        }

        return ReturnCode.Success;
    }

    /**
     * 将各种宠物原型加入宠物列表
     */
    CheckCPet() {
        let $list = ConfigManager.getFellowList();
        Object.keys($list).reduce((sofar, cur)=>{
            let $item = $list[cur];
            if(!this.cpetList[$item['id']]){
                sofar.push($item);
            }
            return sofar;
        }, []).map($it=>{
            let $pi = new PotentialItem(PotentialType.CPet);
            $pi.id = $it['id'];
            $pi.setPoint(0);
            if($it['active']=="1"){
                $pi.setLevel(1);
            }
            else{
                $pi.setLevel(0);
            }
            this.cpetList[$pi.id] = $pi;
        });

        if(!this.cpetList[this.cpetActiveId]) {
            if(Object.keys(this.cpetList).length > 0){
                this.cpetActiveId = Object.keys(this.cpetList).randomElement()[0];
                this.dirty = true;
            }
        }
    }
}

exports = module.exports = potential;
