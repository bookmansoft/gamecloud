let facade = require('../../../facade/Facade')
let {ResTypeStr, em_Effect_Comm, ResType, NotifyType,ActivityType, ReturnCode} = facade.const
let LargeNumberCalculator = require('../../../facade/util/comm/LargeNumberCalculator')
let baseMgr = require('../baseAssistant');
let {fileMap} = require('../../../facade/util/configInterface');
let {isNumber} = require('../../util/reg')

let upgradeChip = {1: Math.ceil(fileMap.constdata.getRoleNum.num)};
for(let j = 2; j <= 30; j++){
    upgradeChip[j] = upgradeChip[1];
    for(let i = 2; i <= j; i++){
        upgradeChip[j] = Math.ceil(upgradeChip[j] + fileMap.constdata.debrisConumRate.num * (i-1));
    }
}

/**
 * 背包管理
 */
class item extends baseMgr
{
    constructor(parent){
        super(parent, 'item');
        this.v = {};

        this.actionData = {
            cur:0,              //当前值
            max:0,              //最大值
            refreshTime:0,      //下一次刷新，如果体力已满则为0
            peroid:0,           //刷新周期（每个周期一点）
            diamond:0,          //钻石
            money:0,            //金币
        };
    }

    /**
     * 设置角色技能
     */
    setSkill(cur){
        //todo:判断技能
        let role = facade.config.fileMap.roledata[cur];
        if(!this.v[cur].sk && this.v[cur].sk != 0){
            this.v[cur].sk = 0;
        }
        if (Math.floor(this.v[cur].sk / 10000) == 0) {
            if (role.unlockskill1.length == 0) {
                this.v[cur].sk += 10000;
            }
            else {
                let allow = 1;
                for (let i = 0; i < role.unlockskill1.length; i++) {
                    if (this.v[role.unlockskill1[i]]) {
                        allow = allow & 1;
                    }
                    else {
                        allow = allow & 0;
                    }
                }
                if (allow == 1) {
                    this.v[cur].sk += 10000;
                }
            }
        }

        if (Math.floor((this.v[cur].sk % 10000) / 100) == 0) {
            if (role.unlockskill2.length == 0) {
                this.v[cur].sk += 100;
            }
            else {
                let allow = 1;
                for (let i = 0; i < role.unlockskill2.length; i++) {
                    if (this.v[role.unlockskill2[i]]) {
                        allow = allow & 1;
                    }
                    else {
                        allow = allow & 0;
                    }
                }
                if (allow == 1) {
                    this.v[cur].sk += 100;
                }
            }
        }

        if (Math.floor(this.v[cur].sk % 100) == 0) {
            if (role.unlockskill3.length == 0) {
                this.v[cur].sk += 1;
            }
            else {
                let allow = 1;
                for (let i = 0; i < role.unlockskill3.length; i++) {
                    if (this.v[role.unlockskill3[i]]) {
                        allow = allow & 1;
                    }
                    else {
                        allow = allow & 0;
                    }
                }
                if (allow == 1) {
                    this.v[cur].sk += 1;
                }
            }
        }
    }
    
    /**
     * 检测技能解锁
     * @param 角色id——判断该角色可解锁的技能
     */
    checkSkill(id){
        return Object.keys(this.v).reduce((sofar, cur)=>{
            if((cur/1000|0) == 1){ //判断是否是角色
                if(!this.v[cur].lv){
                    this.v[cur].lv = 1;
                }
                this.setSkill(cur);
                let role = facade.config.fileMap.roledata[cur];
                                
                for(let i = 0; i < role.unlockskill1.length; i++){
                
                    if(role.unlockskill1[i] == id && Math.floor(this.v[cur].sk/10000) != 0){
                        sofar.push({id:cur, lv:this.v[  cur].lv, 
                                    sk1: Math.floor(this.v[cur].sk/10000),
                                    sk2: Math.floor((this.v[cur].sk%10000)/100),
                                    sk3: Math.floor(this.v[cur].sk%100)});
                    }
                }
                for(let j = 0; j < role.unlockskill2.length; j++){
                
                    if(role.unlockskill2[j] == id && Math.floor((this.v[cur].sk%10000)/100) != 0){
                        sofar.push({id:cur, lv:this.v[cur].lv, 
                            sk1: Math.floor(this.v[cur].sk/10000),
                            sk2: Math.floor((this.v[cur].sk%10000)/100),
                            sk3: Math.floor(this.v[cur].sk%100)});
                    }
                }
                for(let k = 0; k < role.unlockskill3.length; k++){
                
                    if(role.unlockskill3[k] == id && Math.floor(this.v[cur].sk%100) != 0){
                        sofar.push({id:cur, lv:this.v[cur].lv, 
                            sk1: Math.floor(this.v[cur].sk/10000),
                            sk2: Math.floor((this.v[cur].sk%10000)/100),
                            sk3: Math.floor(this.v[cur].sk%100)});
                    }
                }
            }
            return sofar;
        }, []);
    }
    /**
     * 能否解锁角色关联场景
     * 目前只有火影场景 2017.9.25
     * @param sceneid: "1" 火影场景
     */
    unlockedScene(sceneid = "1"){
        if(!this.parent.baseMgr.info.CheckStatus(facade.const.UserStatus.unlockedNinjaScene)){
            if(this.v[1031] && this.v[1032] && this.v[1033]){
                this.parent.baseMgr.info.SetStatus(facade.const.UserStatus.unlockedNinjaScene);
                return {code:ReturnCode.Success};
            }
            else{
                return {code:ReturnCode.taskNotFinished};
            }
        }
        else{
            return {code:ReturnCode.taskBonusHasGot};
        }
    }

    /**
     * 获取角色列表，包含等级信息
     * @returns {*}
     */
    getRoleList(){
        return Object.keys(this.v).reduce((sofar, cur)=>{
            if((cur/1000|0) == 1){ //判断是否是角色
                if(!this.v[cur].lv){
                    this.v[cur].lv = 1;
                }
                this.setSkill(cur);
                sofar.push({
                    id:cur, 
                    lv:this.v[cur].lv, 
                    sk1:Math.floor(this.v[cur].sk/10000), 
                    sk2:Math.floor((this.v[cur].sk%10000)/100), 
                    sk3:Math.floor(this.v[cur].sk%100)
                });
            }
            return sofar;
        }, []);
    }

    /**
     * 升级角色技能
     * @param id 角色id
     * @param skid 技能id
     * @param price 技能升级价格
     */
    upgradeSkill(id,skid,price){
        let role = facade.config.fileMap.roledata[id];
        if(!role || (skid != 1 && skid != 2 && skid != 3)){
            return {code: ReturnCode.illegalData};
        }
        if(!this.v[id].sk){
           this.setSkill(id);
        }
        //判断金币数值是否合法
        let base = facade.config.fileMap.constdata.skillMoneyBase.num;
        let current = 0;
        if(skid == 1){
            current = Math.ceil(base * Math.pow(Math.floor(this.v[id].sk/10000),1.6));
        }
        else if(skid == 2){
            current = Math.ceil(base * Math.pow(Math.floor((this.v[id].sk%10000)/100),1.6));
        }
        else{
            current = Math.ceil(base * Math.pow( Math.floor(this.v[id].sk%100),1.6));
        }
        if(price == current){
            //判断用户金币储量以及升级技能所需关联角色等级            
            if(this.GetRes(ResType.Gold) >=price){
                this.parent.getBonus({type:ResType.Gold, num:-price});
                if(skid == 1){
                    if(role.unlockskill1.length == 0){
                        if(this.v[id].lv > Math.floor(this.v[id].sk/10000)){
                            this.v[id].sk += 10000;
                        }
                        else {
                            return {code: ReturnCode.RoleLeveltooLow};
                        }
                    }
                    else{
                        let allow = 1;
                        for(let i = 0; i < role.unlockskill1.length; i++){
                                if(this.v[role.unlockskill1[i]].lv > Math.floor(this.v[id].sk/10000)){
                                    allow = allow&1;
                                }
                                else {
                                    allow = allow&0;
                                }
                        }
                        if(allow == 1){
                            this.v[id].sk += 10000;
                        }
                        else {
                            return {code: ReturnCode.RoleLeveltooLow};
                        }
                    }
                }
                else if(skid == 2){
                    if(role.unlockskill2.length == 0){
                        if(this.v[id].lv > Math.floor((this.v[id].sk%10000)/100)){
                            this.v[id].sk += 100;
                        }
                        else {
                            return {code: ReturnCode.RoleLeveltooLow};
                        }
                    }
                    else{
                        let allow = 1;
                        for(let i = 0; i < role.unlockskill2.length; i++){
                                if(this.v[role.unlockskill2[i]].lv > Math.floor((this.v[id].sk%10000)/100)){
                                    allow = allow&1;
                                }
                                else {
                                    allow = allow&0;
                                }
                        }
                        if(allow == 1){
                            this.v[id].sk += 100;
                        }
                        else {
                            return {code: ReturnCode.RoleLeveltooLow};
                        }
                    }
                }
                else{
                    if(role.unlockskill3.length == 0){
                        if(this.v[id].lv > Math.floor(this.v[id].sk%100)){
                            this.v[id].sk += 1;
                        }
                        else {
                            return {code: ReturnCode.RoleLeveltooLow};
                        }
                    }
                    else{
                        let allow = 1;
                        for(let i = 0; i < role.unlockskill3.length; i++){
                                if(this.v[role.unlockskill3[i]].lv > Math.floor(this.v[id].sk%100)){
                                    allow = allow&1;
                                }
                                else {
                                    allow = allow&0;
                                }
                        }
                        if(allow == 1){
                            this.v[id].sk += 1;
                        }
                        else {
                            return {code: ReturnCode.RoleLeveltooLow};
                        }
                    }
                    
                }
                return{code:ReturnCode.Success,data:{id:id,sk1: Math.floor(this.v[id].sk/10000),sk2: Math.floor((this.v[id].sk%10000)/100),sk3: Math.floor(this.v[id].sk%100),}};
            }
            else{
                return {code:ReturnCode.MoneyNotEnough};
            }
        }
        else{
            return {code: ReturnCode.illegalData};
        }
    }

    /**
     * 升级角色
     * @param id
     */
    upgradeRole(id){
        let role = facade.config.fileMap.roledata[id];     
        if(!role){
            return {code: ReturnCode.illegalData};
        }
        let chipId = role.pieceid;

        let it = this.GetRes(ResType.Role, id);
        if(!it){
            it = {num:1, lv:0 ,sk:0}; //不存在的角色，准备执行激活操作
        }

        //碎片数量 = 当前等级所需数量 + 碎片成长系数 x (当前等级-1)，其中，碎片成长系数默认为0.2，配在常量表中
        if(!upgradeChip[it.lv+1]){
            return {code: ReturnCode.roleMaxLevel};
        }

        let cnum = upgradeChip[it.lv+1];
        if(!this.v[chipId] || this.v[chipId].num < cnum){
            return {code: ReturnCode.roleChipNotEnough};
        }

        this.AddRes(chipId, -cnum);
        let data = [];
        if(!this.v[id] || !this.v[id].lv){
            //判断角色技能解锁情况
            this.v[id] = it;
            this.setSkill(id);
            data = this.checkSkill(id);
        }
        else{
            this.v[id].lv += 1;
        }     
        return {
            code: ReturnCode.Success,
            data:{
                id: id,
                lv: this.v[id].lv,
                chip: !!this.v[chipId] ? this.v[chipId].num : 0,
                sk1: Math.floor(this.v[id].sk/10000),
                sk2: Math.floor((this.v[id].sk%10000)/100),
                sk3: Math.floor(this.v[id].sk%100),
                unlock: data
            }
        };
    }

    /**
     * 获取背包列表
     * @returns {{}|*}
     */
    getList(){
        return this.v;
    }

    /**
     * 判断给定奖励和指定类型是否相关
     */
    relation(bonus, $type, $ret = false){
        function $relation(_bonus, _type){
            switch(_type){
                case ResType.Action:
                    //return _bonus.id == 22 || _bonus.id == 23;
                    return _bonus.id == 23; //目前满体力情况下能买矿泉水，但不能买咖啡机
                }
            return _bonus.type == _type;
        }

        if(bonus.constructor == String){
            let bo = this.parent.getBonus(JSON.parse(bonus));
            $ret = $ret || $relation(bo,$type);
        }
        else if(bonus.constructor == Array){
            bonus.map(item=>{
                $ret = $ret || $relation(item,$type);
            });
        }
        else{
            $ret = $ret || $relation(bonus,$type);
        }
        return $ret;
    }

    //region 统一的资源操作接口
    GetRes($type, $id=0){
        let $t = parseInt($type)+ parseInt($id);
        switch($type){
            case ResType.Gold:
                return !!this.v[$t] ? LargeNumberCalculator.FromString(this.v[$t]) : LargeNumberCalculator.FromString('0,0');
            default:
                return !!this.v[$t] ? this.v[$t] : 0;
        }
        return 0;
    }

    isMaxRes($type, $id=0){
        return this.GetRes($type,$id) >= this.GetResMaxValue($type, $id);
    }
    GetResMaxValue($type, $id=0){
        switch($type){
            case ResType.Action:
                return facade.configration.DataConst.action.max;
        }
        return facade.const.MAX_INT;
    }

    SetRes(type, num, id=0){
        switch(type){
            case ResType.Gold:
                let $rt = LargeNumberCalculator.Load(num);
                this.v[type+id] = $rt.ToString();
                break;
            default:
                this.v[type+id] = num;
                break;
        }
    }

    /**
     * 增加资源
     * @param {*} type  资源类型
     * @param {*} num   增加的数量
     * @param {*} max   是否进行爆仓判断
     * @param {*} id    分类编号
     */
    AddRes(type, num, max=true, id=0){
        if(!isNumber(type)){
            if(!!ResTypeStr[type]){
                type = ResTypeStr[type];
            }
            else{
                return; //参数非法
            }
        }
        else{
            type = parseInt(type);
        }

        let $t = type + parseInt(id);
        switch(type){
            case ResType.Gold:
                let $rt = LargeNumberCalculator.FromString(this.v[$t])._add_(num);
                this.v[$t] = $rt.ToString();
                break;
            default:
                if(max){
                    num = (Math.min(this.GetResMaxValue(type,id) - this.GetRes(type,id), num));
                }
                if(!!this.v[$t]){
                    this.v[$t] += num;
                }
                else{
                    this.v[$t] = num;
                }
                this.v[$t] = this.v[$t] | 0; //取整

                if(this.v[$t] <= 0){
                    delete this.v[$t];
                }
                break;
        }
        this.dirty = true;
        facade.current.notifyEvent('user.resAdd', {user:this.parent, data:{type:type, id: id, value:num}});
    }

    /**
     * 判断是否有足够的资源
     * @return {Boolean}
     */
    ResEnough($type, $val,$id=0){
        switch($type){
            case ResType.Gold:
                let $rt = this.GetRes($type, $id);
                return LargeNumberCalculator.Compare($rt, $val) >= 0;
            default:
                return this.GetRes($type, $id) >= $val;
        }
    }
    //endregion

    //region 体力管理
    
    /**
     * 自动恢复体力, 同时计算离线收益
     */
    AutoAddAP() {
        let recover = Math.max(1, this.parent.effect().CalcFinallyValue(em_Effect_Comm.ActionRecover, facade.configration.DataConst.action.add) | 0);
        let $iHourSecond = this.parent.effect().CalcFinallyValue(em_Effect_Comm.DiscountActionTime, facade.configration.DataConst.action.iHourSecond) | 0;
        this.actionData.refreshTime = 0;
        
        //首先判断体力值是否已满，如果已满甚至已经超过最大值，就不要更新了，这样避免了体力被强制平仓
        if(!this.isMaxRes(ResType.Action)){
            let ct = facade.util.now();

            let passSecond 	= ct - this.v.refresh;
            if(passSecond < 0){
                this.v.refresh = ct;
            }
            else{
                let rec = (passSecond / $iHourSecond) | 0;
                if(rec > 0){
                    this.parent.getBonus({type:ResType.Action, num:rec * recover});
                    this.v.refresh += rec * $iHourSecond;
                }
            }

            this.actionData.refreshTime = (this.actionData.cur == this.actionData.max) ? 0 : this.v.refresh + $iHourSecond - ct;
        }
        this.actionData.peroid = $iHourSecond / recover;
    };

    /**
     * 返回体力描述信息结构
     */
    getActionData(){
        this.actionData.cur = this.GetRes(ResType.Action);
        this.actionData.max = this.GetResMaxValue(ResType.Action);
        this.actionData.money = this.GetRes(ResType.Gold);
        this.actionData.diamond = this.GetRes(ResType.Diamond);
        return this.actionData;
    }

    //endregion    

    /**
     * 使用指定道具
     * @param id
     */
    useItem(id, num=1){
        if(num.constructor == String){
            num = parseInt(num);
        }
        num = Math.min(110, !!num ? num : 1); //一次最多用110张

        if(this.GetRes(id) >= num){
            this.AddRes(id, -num);
            //触发了特殊道具被使用事件
            facade.current.notifyEvent('user.itemUsed', {user:this.parent, data:{type:id, value:num}});
            return {code: ReturnCode.Success, data:this.getList()};
        }
        else{
            return {code: ReturnCode.itemNotExist};
        }
    }
}

exports = module.exports = item;
