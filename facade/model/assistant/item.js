let facade = require('../../../facade/Facade')
let {ReturnCode, ResTypeStr, em_Effect_Comm, ResType} = facade.const
let baseMgr = facade.Assistant
let LargeNumberCalculator = facade.Util.LargeNumberCalculator
let {isNumber} = require('../../util/reg')

/**
 * 背包管理
 */
class item extends baseMgr
{
    /**
     * 构造函数
     * @param {BaseUserEntity} parent 
     */
    constructor(parent){
        super(parent, 'item');

        /**
         * 背包内容存储对象
         */
        this.v = {};
        /**
         * 基础信息(主要是体力)下行报文
         */
        this.actionData = {
            cur:0,              //当前值
            max:0,              //最大值
            refreshTime:0,      //下一次刷新，如果体力已满则为0
            peroid:0,           //刷新周期（每个周期一点）
            diamond:0,          //钻石
            money:0,            //金币
        };
    }

    //#region 背包基本管理

    /**
     * 获取背包列表
     * @returns {{}|*}
     */
    getList() {
        return this.v;
    }

    /**
     * 获取指定资源的数量
     * @param  {...any} xid 
     */
    GetRes(...xid) {
        let [type, id] = [...xid];
        let $t = this.combineId(type, id);
        if($t != -1) {
            switch(type){
                case ResType.Gold:
                    return !!this.v[$t] ? LargeNumberCalculator.FromString(this.v[$t].num) : LargeNumberCalculator.FromString('0,0');
                default:
                    return !!this.v[$t] ? this.v[$t].num : 0;
            }
        }
        return 0;
    }

    /**
     * 指定资源是否达到最大容量
     * @param  {...any} xid 
     */
    isMaxRes(...xid) {
        return this.GetRes(...xid) >= this.GetResMaxValue(...xid);
    }

    /**
     * 返回指定资源的最大容量
     * @param {Number} type 
     */
    GetResMaxValue(type) {
        //todo 对 ResType.Gold 大数型资源要特殊判断
        switch(type) {
            case ResType.Action:
                return facade.config.fileMap.DataConst.action.max;
        }
        return facade.const.MAX_INT;
    }

    /**
     * 直接设置资源数值
     * @param {*} num 
     * @param  {...any} xid 
     */
    SetRes(num, ...xid) {
        let [type, id] = [...xid]

        let tid = this.combineId(type, id);
        if(tid < 0 || tid >= 100) {
            return;
        }

        if(!this.v[tid]) {
            this.v[tid] = {num: 0};
        }

        switch(type){
            case ResType.Gold:
                let $rt = LargeNumberCalculator.Load(num);
                this.v[tid].num = $rt.ToString();
                break;
            default:
                this.v[tid].num = num;
                break;
        }
    }

    /**
     * 计算复合索引值
     * @param {*} type 
     * @param {*} id 
     * @return {Number} 非法类型返回-1，type小于100直接返回type，大于等于100返回 type+id
     */
    combineId(type, id=0) {
        type = this.checkType(type);
        if(type < 100) {
            return type; //非法类型，以及数值小于100的类型(单独索引)：直接返回 type
        }
        return type + id; //数值大于等于100的类型(复合索引)：返回 type+id
    }

    /**
     * 将预定义的字符型资源类型，转化为数值型资源类型
     * @param {*} type 
     */
    checkType(type) {
        if(!isNumber(type)) {
            if(!!ResTypeStr[type]) {
                return ResTypeStr[type];
            } else {
                return -1; //参数非法
            }
        } else {
            return parseInt(type);
        }
    }

    /**
     * 增加资源
     * @param {*} num   增加的数量
     * @param {*} max   是否进行爆仓判断
     * @param  {...any} xid 资源类型
     */
    AddRes(num, max, ...xid) {
        let [type, id] = [...xid];
        let $t = this.combineId(type, id);
        if($t!=-1) {
            if(!this.v[$t]) {
                this.v[$t] = {num:0};
            }

            switch(type){
                case ResType.Gold:
                    let $rt = LargeNumberCalculator.FromString(this.v[$t].num)._add_(num);
                    this.v[$t].num = $rt.ToString();
                    break;

                default:
                    if(max) {
                        num = Math.min(this.GetResMaxValue(type) - this.GetRes(type, id), num);
                    }
                    this.v[$t].num = (this.v[$t].num + num) | 0;
        
                    if(this.v[$t].num <= 0){
                        delete this.v[$t];
                    }
                    break;
            }

            this.dirty = true;
            this.parent.core.notifyEvent('user.resAdd', {user:this.parent, data:{type:type, id: id, value:num}});
        }
    }

    /**
     * 判断是否有足够的资源
     * @return {Boolean}
     */
    ResEnough($val, ...xid) {
        let [type, id] = [...xid];
        switch(type){
            case ResType.Gold:
                let $rt = this.GetRes(type, id);
                return LargeNumberCalculator.Compare($rt, $val) >= 0;
            default:
                return this.GetRes(type, id) >= $val;
        }
    }

    //#endregion

    //#region 体力管理
    
    /**
     * 自动恢复体力, 同时计算离线收益
     */
    AutoAddAP() {
        //使用 this.v[0] 存储刷新时间
        if(!this.v[0]) {
            this.v[0] = {num:0};
        }

        let recover = Math.max(1, this.parent.effect().CalcFinallyValue(em_Effect_Comm.ActionRecover, facade.config.fileMap.DataConst.action.add) | 0);
        let $iHourSecond = this.parent.effect().CalcFinallyValue(em_Effect_Comm.DiscountActionTime, facade.config.fileMap.DataConst.action.iHourSecond) | 0;
        this.actionData.refreshTime = 0;
        
        //首先判断体力值是否已满，如果已满甚至已经超过最大值，就不要更新了，这样避免了体力被强制平仓
        if(!this.isMaxRes(ResType.Action)){
            let ct = facade.util.now();

            let passSecond 	= ct - this.v[0].num;
            if(passSecond < 0) {
                this.v[0].num = ct;
            }
            else{
                let rec = (passSecond / $iHourSecond) | 0;
                if(rec > 0){
                    this.parent.getBonus({type:ResType.Action, num:rec * recover});
                    this.v[0].num += rec * $iHourSecond;
                }
            }

            this.actionData.refreshTime = (this.actionData.cur == this.actionData.max) ? 0 : this.v[0].num + $iHourSecond - ct;
        }
        this.actionData.peroid = $iHourSecond / recover;
    };

    /**
     * 返回体力描述信息结构
     */
    getActionData(){
        this.actionData.cur = this.GetRes(ResType.Action);
        this.actionData.max = this.GetResMaxValue(ResType.Action);
        this.actionData.money = this.GetRes(ResType.Coin);
        this.actionData.diamond = this.GetRes(ResType.Diamond);
        return this.actionData;
    }

    //#endregion    
}

exports = module.exports = item;
