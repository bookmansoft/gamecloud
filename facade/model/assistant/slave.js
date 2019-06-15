let facade = require('../../../facade/Facade')
let {EntityType, ActionExecuteType, UserStatus, NotifyType, ActivityType, ResType, ReturnCode} = facade.const
let baseMgr = require('../baseAssistant')

/**
 * 奴隶管理器
 * Added by liub 2017.7.25
 */
class slave extends baseMgr {
    constructor(parent){
        super(parent, 'friend');
        this.v = {
            master:[],          //主人
            slave:[],           //奴隶
        };
    }

    /**
     * 状态检测，自动释放到期奴隶
     */
    CheckStatus(){
        if(!this.v.master){
            this.v.master = [];
        }
        if(!this.v.slave){
            this.v.slave = [];
        }

        let $now = facade.util.now();
        for(let idx in this.v.master){
            if(this.v.master[idx].time < $now) {
                //被奴役时间到期，你自动获得了解放
                let $msg = {type:NotifyType.slaveRelease, info:{src:this.v.master[idx].openid, dst:this.parent.openid, time:this.v.master[idx].time}};
                this.parent.socialNotify($msg);
                this.parent.socialNotify($msg, $msg.info.src);
            }
        }

        for(let idx in this.v.slave){
            if(this.v.slave[idx].time < $now) {
                //奴役时间到期，你主动释放奴隶 - 向对方发送事件
                let $msg = {type:NotifyType.slaveRelease, info:{src:this.parent.openid, dst:this.v.slave[idx].openid, time:this.v.slave[idx].time}};
                this.parent.socialNotify($msg);
                this.parent.socialNotify($msg, $msg.info.dst);
            }
        }

        if(this.v.master.length == 0){ 
            this.parent.baseMgr.info.UnsetStatus(UserStatus.slave); //修改奴隶状态位
        }
        else{
            this.parent.baseMgr.info.SetStatus(UserStatus.slave); //修改奴隶状态位
        }
        if(this.v.slave.length == 0){ //所有奴隶都被释放
            this.parent.baseMgr.info.UnsetStatus(UserStatus.master); //修改奴隶主状态位
        }
        else{
            this.parent.baseMgr.info.SetStatus(UserStatus.master); //修改奴隶主状态位
        }
    }

    /**
     * 释放全部奴隶，在自己被奴役的时候调用
     */
    releaseAll(){
        for(let idx in this.v.slave){
            //奴役时间到期，你主动释放奴隶 - 向对方发送事件
            let $msg = {type:NotifyType.slaveRelease, info:{src:this.parent.openid, dst:this.v.slave[idx].openid, time:this.v.slave[idx].time}};
            this.parent.socialNotify($msg);
            this.parent.socialNotify($msg, $msg.info.dst);
        }
    }

    /**
     * 鞭挞
     * @param {*} openid 
     */
    lash(openid){
        this.CheckStatus();
        if(!this.parent.getTxFriendMgr().getFriend(openid)){ //没有发现指定好友
            return [ReturnCode.socialNoEnemyToAttack, 0];
        }
        else{
            let slv = this.getSlave(openid);
            if(!slv){//当前对象未被抓捕
                return [ReturnCode.socialSimUserNotExist, 0];
            }
            else{
                //检测并扣除所需道具
                // "401":{
                // 	"id":401,
                // 	"desc":"鞭打奴隶消耗的道具；无法直接使用",
                // },
                let ret = this.parent.baseMgr.item.useItem(401, 1);
                if(ret.code == ReturnCode.Success){
                    let fri = this.parent.getTxFriendMgr().getFriend(openid);
                    // 奴隶收到鞭挞推送消息
                    if(!!fri) {
                        let desc = facade.config.slaveMsg["lash"].desc;
                        this.parent.core.service.txApi.send_gamebar_msg(this.parent,openid,3,desc,"V1_AND_QZ_4.9.3_148_RDM_T");
					}
                }
                return [ret.code, slv.time];
            }
        }
    }

    /**
     * 赎身，扣除相应的钻石
     * @param {string} openid - 标记当前主人的标识串
     */
    ransom(openid){
        this.CheckStatus();

        if(!this.parent.getTxFriendMgr().getFriend(openid)){ //没有发现指定好友
            return ReturnCode.socialNoEnemyToAttack;
        }
        else{
            let master = this.getMaster(openid);
            if(!master){ 
                return ReturnCode.socialSimUserNotExist;
            }            
            else{
                //检测并扣除所需道具
                let $cost = Math.ceil((master.time - facade.util.now()) / 3600.0);
                if(this.parent.baseMgr.item.GetRes(ResType.Diamond) >= $cost){
                    this.parent.getBonus({type:ResType.Diamond, num:-$cost});
                    let fri = this.parent.getTxFriendMgr().getFriend(openid);
                    // 奴隶主收到赎身推送消息
                    if(!!fri) {
                        let desc = facade.config.slaveMsg["ransom"].desc;
                        this.parent.core.service.txApi.send_gamebar_msg(this.parent,openid,3,desc,"V1_AND_QZ_4.9.3_148_RDM_T");
                    }
                    return ReturnCode.Success;
                }
                else{
                    return ReturnCode.DiamondNotEnough;
                }
            }
        }
    }

    food(openid){
        this.CheckStatus();

        if(!this.parent.getTxFriendMgr().getFriend(openid)){ //没有发现指定好友
            return ReturnCode.socialNoEnemyToAttack;
        }
        else if(!this.findSlave(openid)){ //当前对象未被抓捕
            return ReturnCode.socialSimUserNotExist;
        }
        else{
            //检测并扣除所需道具
            // "402":{
            // 	"id":402,
            // 	"desc":"给奴隶加餐消耗的道具；无法直接使用",
            // },
            let ret = this.parent.baseMgr.item.useItem(402, 1);
            if(ret.code == ReturnCode.Success){
                let fri = this.parent.getTxFriendMgr().getFriend(openid);
                // 奴隶收到喂食推送消息
                if(!!fri) {
                    let desc = facade.config.slaveMsg["food"].desc;
                    desc = desc.replace("&slave",decodeURIComponent(fri.name));
                    this.parent.core.service.txApi.send_gamebar_msg(this.parent,openid,3,desc,"V1_AND_QZ_4.9.3_148_RDM_T");
                }
            }
            return ret.code;
        }
    }

    avenge(openid){
        this.CheckStatus();

        if(!this.parent.getTxFriendMgr().getFriend(openid)){ //没有发现指定好友
            return ReturnCode.socialNoEnemyToAttack;
        }
        else if(!this.findMaster(openid)){
            return ReturnCode.socialSimUserNotExist;
        }
        else{
            //检测并扣除所需道具
            // "403":{
            // 	"id":403,
            // 	"desc":"报复奴隶主消耗的道具；无法直接使用",
            // },
            // let ret = this.parent.baseMgr.item.useItem(403, 1);
            let fri = this.parent.getTxFriendMgr().getFriend(openid);
            // 奴隶主收到报复推送消息
            if(!!fri) {
                let desc = facade.config.slaveMsg["avange"].desc;
                this.parent.core.service.txApi.send_gamebar_msg(this.parent,openid,3,desc,"V1_AND_QZ_4.9.3_148_RDM_T");
            }
            return ReturnCode.Success;
        }
    }
    flattery(openid){
        this.CheckStatus();

        if(!this.parent.getTxFriendMgr().getFriend(openid)){ //没有发现指定好友
            return [ReturnCode.socialNoEnemyToAttack, 0];
        }
        else{
            let mst = this.getMaster(openid);
            if(!mst){
                return [ReturnCode.socialSimUserNotExist, 0];
            }

            //检测并扣除所需道具
            // "403":{
            // 	"id":403,
            // 	"desc":"报复奴隶主消耗的道具；无法直接使用",
            // },
            let ret = this.parent.baseMgr.item.useItem(403, 1);
            if(ret.code == ReturnCode.Success){
                if(this.parent.getActionMgr().GetExecuteNum(ActionExecuteType.slaveFlattery)<=3){
                    mst.time -= facade.config.fileMap.DataConst.slave.catchTime * 0.05;
                }
                this.CheckStatus();
                let fri = this.parent.getTxFriendMgr().getFriend(openid);
                // 奴隶主收到谄媚推送消息
                if(!!fri) {
                    let desc = facade.config.slaveMsg["flattery"].desc;
                    this.parent.core.service.txApi.send_gamebar_msg(this.parent,openid,3,desc,"V1_AND_QZ_4.9.3_148_RDM_T");
                }
            }
            return [ret.code, mst.time - facade.util.now()];
        }
    }
    /**
     * 判断是否可逃脱
     * @param {*} openid 
     */
    canEscape(openid){
        this.CheckStatus();

        if(!this.findMaster(openid)){ //没有发现指定好友
            return ReturnCode.socialNoEnemyToAttack;
        }
        else{
            return ReturnCode.Success;
        }
    }

    /**
     * 判断是否能够抓捕指定好友为奴隶
     * @param {*} openid 
     */
    canCatch(openid){
        this.CheckStatus();

        if(this.v.master.length>0){ //自己被他人奴役
            return ReturnCode.socialIsSlave;
        }
        else if(!this.parent.core.options.debug && this.v.slave.length >= this.MaxSlave){ //奴隶数量达到上限
            return ReturnCode.socialMaxSlave;
        }
        else if(this.findSlave(openid)){ //当前对象已被抓捕
            return ReturnCode.socialIsEnemy;
        }
        else{
            return ReturnCode.Success;
        }
    }

    findSlave(openid) {
        let $find = false;
        for(let idx in this.v.slave){
            if(this.v.slave[idx].openid == openid){
                $find = true;
                break;
            }
        }
        return $find;
    }

    findMaster(openid) {
        let $find = false;
        for(let idx in this.v.master){
            if(this.v.master[idx].openid == openid){
                $find = true;
                break;
            }
        }
        return $find;
    }

    getMaster(openid) {
        for(let idx in this.v.master){
            if(this.v.master[idx].openid == openid){
                return this.v.master[idx];
            }
        }
        return null;
    }

    getSlave(openid) {
        for(let idx in this.v.slave){
            if(this.v.slave[idx].openid == openid){
                return this.v.slave[idx];
            }
        }
        return null;
    }

    /**
     * 移除指定的奴隶主
     * @param {*} openid 
     */
    removeMaster(openid){
        for(let idx in this.v.master){
            if(this.v.master[idx].openid == openid) {
                return this.removeMasterByIdx(idx);
            }
        }
        return [ReturnCode.Success, 0];
    }

    /**
     * 移除指定的奴隶
     * @param {*} openid 
     */
    removeSlave(openid){
        for(let idx in this.v.slave){
            if(this.v.slave[idx].openid == openid) {
                return this.removeSlaveByIdx(idx);
            }
        }
        return [ReturnCode.Success, 0];
    }

    removeMasterByIdx(idx){
        if(!this.v.master[idx]){
            return [ReturnCode.Success, 0];
        }
        let ret = [ReturnCode.Success, this.v.master[idx].time];

        this.v.master.splice(idx, 1);
        this.dirty = true;

        if(this.v.master.length == 0){ 
            this.parent.baseMgr.info.UnsetStatus(UserStatus.slave); //修改奴隶状态位
        }

        return ret;
    }

    calcSlaveTime(t){
        let $now = facade.util.now();
        return Math.ceil(Math.max(0, $now - (t - facade.config.fileMap.DataConst.slave.catchTime)) / 3600.0);
    }
    fullSlaveTime(t){
        return t >= facade.config.fileMap.DataConst.slave.catchTime;
    }

    removeSlaveByIdx(idx){
        if(!this.v.slave[idx]){
            return [ReturnCode.Success, 0];
        }
        let ret = [ReturnCode.Success, this.v.slave[idx].time];
        
        //写报告, 附加奖励字段
        let msg = {
            type:NotifyType.slaveRelease, 
            info:{
                src:    this.parent.openid, 
                dst:    this.v.slave[idx].openid, 
                time:   this.v.slave[idx].time,
                code:   ReturnCode.Success,
            }
        };

        let time = this.calcSlaveTime(msg.info.time);
        //释放分两种情况（1、期满自动释放，获得两个奖励——即全额奖励；2、玩家提前释放——只获得时常奖励：金币
        if(time > 0){
            //根据msg.info.time和当前时间的差额计算奖励
            msg.info.bonus = [{type:ResType.Gold, num:50*time}];
            if(this.fullSlaveTime(time)){
                msg.info.bonus.push({type:ResType.Item, id:22, num:20});
            }
        }
        this.parent.core.GetMapping(EntityType.Mail).Create(this.parent, msg, "system", this.parent.openid);
        //删除奴隶
        this.v.slave.splice(idx, 1);
        this.dirty = true;

        if(this.v.slave.length == 0){ //所有奴隶都被释放
            this.parent.baseMgr.info.UnsetStatus(UserStatus.master); //修改奴隶主状态位
        }

        return ret;
    }

    /**
     * 添加一个主人
     * @param {*} openid 
     */
    addMaster(openid){
        this.CheckStatus();

        //修改奴隶状态位
        this.parent.baseMgr.info.SetStatus(UserStatus.slave); 
        if(this.v.master.length == 0){
            //因为自己被抓捕，所以主动释放所有奴隶
            this.releaseAll();

            //添加新的主人条目
            this.v.master.push({openid:openid, time: facade.config.fileMap.DataConst.slave.catchTime + facade.util.now()});
            this.dirty = true;

            return ReturnCode.Success;
        }
        else {
            return ReturnCode.socialCatched;
        }
    }

    /**
     * 添加一个奴隶
     */
    addSlave(openid){
        this.CheckStatus();

        let $find = false;
        for(let idx in this.v.slave){
            if(this.v.slave[idx].openid == openid){
                $find = true;
                break;
            }
        }
        if(this.v.slave.length >= this.MaxSlave) {
            return ReturnCode.socialMaxSlave;
        }
        else if(this.findSlave(openid)){
            return ReturnCode.socialCatchedBySelf;
        }
        else {
            this.v.slave.push({openid:openid, time: facade.config.fileMap.DataConst.slave.catchTime + facade.util.now()});
            this.dirty = true;

            this.parent.baseMgr.info.SetStatus(UserStatus.master); //修改奴隶主状态位

            return ReturnCode.Success;
        }

        let m = {
            "type":3105,
            "info":{
                "src":"777.492",
                "dst":"777.493",
                "bonus":[
                    {"type":"M","num":-1000},
                    {"type":"I","id":22,"num":20}
                ]
            }
        }
    }

    /**
     * 最大可抓捕数量
     */
    get MaxSlave(){
        if(this.parent.hisGateNo < 5){
            return 0;
        }
        else if(this.parent.hisGateNo >= 5 && this.parent.hisGateNo < 20){
            return 2;
        }
        else if(this.parent.hisGateNo >= 20 && this.parent.hisGateNo < 35){
            return 4;
        }
        else if(this.parent.hisGateNo >= 35 && this.parent.hisGateNo < 50){
            return 10;
        }
        else{
            return 20;
        }
    }

    /**
     * 获取列表
     */
    getList(){
        this.CheckStatus();

        let ret = {
            master:[],          //主人
            slave:[],           //奴隶
        };
        this.v.slave.map(item=>{
            ret.slave.push({openid: item.openid, time: item.time - facade.util.now()});
        });
        this.v.master.map(item=>{
            ret.master.push({openid: item.openid, time: item.time - facade.util.now()});
        });
        return ret;
    }
}

exports = module.exports = slave;
