/**
 * 每日活动管理
 */
let facade = require('../../Facade')
let {ReturnCode, NotifyType, ResType, DailyActivityStatus} = facade.const
let CoreOfIndex = require('../../core/CoreOfIndex')

class dailyactivity extends facade.Service
{
    /**
     * 
     * @param {CoreOfIndex} parent 
     */
    constructor(parent) {
        super(parent);

        this.users = new Map();
        this.sorted = [];                               //排位表
        this.prop = 0;                                  //奖池总额
        this.score = 0;                                 //总积分
        this.groupA = 0;                                //阵营1
        this.groupB = 0;                                //阵营2
        this.$state = DailyActivityStatus.Idle;          //每日活动状态
        this.id = null;
    }

    /**
     * 从数据库载入活动信息
     */
    async loadDb() {
        let it = await facade.models.system(this.core.options.mysql).findCreateFind({
            where: {
                id: 1
            },
            defaults: { activity: "{}", dailyactivity: "{}" },
        });
        this.sysObj = it[0];

        let $info = {};
        if (!!this.sysObj.dailyactivity) {
            try {
                $info = JSON.parse(this.sysObj.dailyactivity);
            }
            catch (e) {
            }
        }
        if (!!$info.prop) { //存在历史活动信息
            this.prop = parseInt($info.prop);                                  //奖池总额
        }
        if (!!$info.score) { //存在历史活动信息
            this.score = parseInt($info.score);                                //总积分
        }
        if (!!$info.groupA) { //存在历史活动信息
            this.groupA = parseInt($info.groupA);                              //阵营1
        }
        if (!!$info.groupB) { //存在历史活动信息
            this.groupB = parseInt($info.groupB);                              //阵营2
        }
        if (!!$info.state) {
            this.$state = $info.state;
        }
        //从缓存管理器中载入缓存的用户信息 act是一个集合，里面存储了所有拥有分数记录的用户的复合ID
        let uset = this.core.cacheMgr.groupKeys('act');
        if (!!uset) {
            for (let $id of uset) {
                let us = this.core.cacheMgr.get($id);
                if (!!us) {
                    this.users.set(`${us.domain}.${us.openid}`, us);
                }
            }
        }
    }

    /**
     * (！！！慎用)活动结束时，清理活动信息
     */
    async clearActivityInfo() {
        this.prop = 0;                                  //奖池总额
        this.score = 0;                                 //总积分
        this.groupA = 0;                                //阵营1
        this.groupB = 0;                                //阵营2
        this.Save();

        this.users = new Map();
        this.sorted = [];                               //排位表

        //从Redis中载入缓存的用户信息 act是一个集合，里面存储了所有拥有分数记录的用户的复合ID
        try {
            let uset = this.core.cacheMgr.groupKeys('act');
            if (!!uset) {
                //删除用户活动记录
                for (let $id of uset) {
                    this.core.cacheMgr.del($id);
                }
                this.core.cacheMgr.groupDel('act', uset); //删除集合中全部元素
            }
        }
        catch (e) {
            console.error(e);
        }
    }

    /**
     * 将活动信息存入数据库
     */
    Save() {
        this.sysObj.dailyactivity = JSON.stringify({
            prop: this.prop,                                  //奖池总额
            score: this.score,                                 //总积分
            groupA: this.groupA,                                //阵营1
            groupB: this.groupB,                                //阵营2
            state: this.$state,                                  //活动状态
            id: this.id,                                        //活动编号
        });
        this.sysObj.save();
    }

    /**
     * 新增：定时检测函数，系统每30秒调用一次
     */
    tick() {
        //检测状态
        this.checkStatus();
        //写入数据库
        this.Save();
    }

    /**
     * 对参与活动的用户进行排序
     */
    sortUser() {
        let rank = 1;
        this.sorted.sort((a, b) => {
            return b.score - a.score;
        });
        this.sorted.map(item => {
            item.rank = rank++;
        });
    }
    /**
     * 查询当前各阵营人数
     */
    countChoose() {
        return { groupA: this.groupA, groupB: this.groupB };
    }
    
    /**
     * 检测玩家是否参与预热
     */
    async checkJoin(domain, openid){
        let uinfo = await this.checkUser(domain, openid);
        if (!uinfo) {
            return { code: ReturnCode.userIllegal };
        }
        else {
            if(!uinfo.join){
                uinfo.join = 0;
            }
            return {code:ReturnCode.Success,data:{join:uinfo.join}};
        }
    }
    /**
     * 活动正式开启时，消耗瓶盖参与活动
     */
    async toJoin(domain, openid){
        let uinfo = await this.checkUser(domain, openid);
        if (!uinfo) {
            return { code: ReturnCode.userIllegal };
        }
        else {
            if(!uinfo.join){
                uinfo.join = 0;
            }
            if(uinfo.join != 1) {
                uinfo.join = 1;
                this.saveUserInfo(uinfo);
            }
            else{
                return {code:ReturnCode.Error};
            }
            this.prop += 2;
            return {code:ReturnCode.Success,data:{join:uinfo.join}};
        }
        
    }
    /**
     * 为指定用户记录其消耗活动道具数量,并添加到阵营人数中
     * @param {*} domain 
     * @param {*} openid 
     * @param {*} $choose 玩家所选阵营
     * @param {*} $num    玩家投入道具数量  
     */
    async addProp(domain, openid, $choose, $num) {
        let cur = new Date();
        let allow = (cur.getHours() < 14 && cur.getHours() >= 12) ? true : false;     //只有12-14点可投奖

        if (this.$state != DailyActivityStatus.Ready) {
            //只有活动预热状态能投奖
            return { code: ReturnCode.activityNoStart };
        }
        if (!allow) {
            return { code: ReturnCode.cannotAddProp };
        }
        let $uid = `${domain}.${openid}`;
        if (typeof $num != "number") {
            $num = parseInt($num);
        }

        let uinfo = await this.checkUser(domain, openid);
        if (!uinfo) {
            return { code: ReturnCode.Error };
        }
        else {
            let si = await this.core.getUserIndex(domain, openid);
            if (!si) {
                return { code: ReturnCode.Error };
            }
            if(uinfo.join != 1){//判断玩家是否参与过预热活动的依据
                uinfo.join = 1;
                this.saveUserInfo(uinfo);
            }
            this.prop += $num;
            if ($choose == 1) {
                this.groupA += 1;
            }
            else if ($choose == 2) {
                this.groupB += 1;
            }
            //todo:改为随机奖励
            let bonus = [{ type: ResType.Gold, num: Math.floor(Math.random()*500) }];
            // bonus.push(this.parent.getTxFriendMgr().getRandomBonus(false));
            //向用户发送一封邮件
            this.core.remoteCall('remote.userNotify', {
                domain: si.domain,
                openid: si.openid,
                msg: {
                    type: NotifyType.DailyActivityInstantBonus,
                    info: { bonus: bonus, num: $num }
                }
            }, null, si);
            
            return {
                code: ReturnCode.Success,
                data: {
                    prop: this.countProp(),
                    choose: this.countChoose(),
                    bonus: bonus
                }
            };
        }
    }

    /**
     * 统计奖池总额
     */
    countProp() {
        return this.prop * 10;
    }

    /**
     * 指定用户设定分数
     * @param {*} domain 
     * @param {*} openid 
     * @param {*} $score 传入本次活动关卡分数  
     */
    async setScore(domain, openid, $score) {
        if (this.$state != DailyActivityStatus.Active) {
            return { code: ReturnCode.activityNoStart };
        }
        if (typeof $score != "number") {
            $score = parseInt($score);
        }
        let uinfo = await this.checkUser(domain, openid);
        if (!uinfo) {
            return { code: ReturnCode.Error };
        }
        else {
            //将玩家本次分数添加到活动总分中
            // this.score += $score;
            //判断玩家最高分
            if (uinfo.score < $score) {
                uinfo.score = $score;
                this.saveUserInfo(uinfo);
            }
            return { code: ReturnCode.Success };
        }
    }

    /**
     * 写入缓存管理器
     * @param {*} uinfo
     */
    async saveUserInfo(uinfo) {
        let $id = `act.${uinfo.domain}.${uinfo.openid}`;
        this.core.cacheMgr.groupAdd('act', $id);          //将用户ID加入‘已参与本次活动’的集合中
        this.core.cacheMgr.set($id, uinfo);               //将用户的活动记录，以用户ID为索引，写入redis中
    }

    /**
     * 统计全部玩家积分
     */
    countScore() {
        return this.score;
    }
    /**
     * 检测玩家是否加入过活动
     * @param {*} domain 
     * @param {*} openid 
     */
    async checkUser(domain, openid) {
        let $uid = `${domain}.${openid}`;
        if (!this.users.has($uid)) {
            let uo = await this.core.getUserIndex(domain, openid);
            if (!uo) {
                return null;
            }

            let uinfo = {
                uid: $uid,       //玩家ID
                name: uo.name,   //玩家昵称
                icon: uo.icon,   //玩家头像
                score: 0,        //活动积分
                rank: 0,         //排名
                bonus:0,
                join:0,          //玩家是否投过奖
                domain: domain,
                openid: openid,
            };
            this.users.set($uid, uinfo);
            this.saveUserInfo(uinfo);
        }
        return this.users.get($uid);
    }

    /**
     * 获取活动状态参数
     */
    async getInfo(domain, openid) {
        switch (this.$state) {
            case DailyActivityStatus.Active:
                return {
                    code: ReturnCode.Success,
                    data: {
                        prop: this.countProp(),
                        state: this.$state
                    }
                };
                break;
            case DailyActivityStatus.Ready:
                return {
                    code: ReturnCode.Success,
                    data: {
                        prop: this.countProp(),
                        state: this.$state
                    }
                };
                break;
            case DailyActivityStatus.Bonus:
                return {
                    code: ReturnCode.Success,
                    data: {
                        prop: this.countProp(),
                        state: this.$state
                    }
                };
                break;
            case DailyActivityStatus.End:
                return {
                    code: ReturnCode.Success,
                    data: {
                        prop: this.countProp(),
                        state: this.$state
                    }
                };
                break;
            default:
                return { code: ReturnCode.activityNoStart, data: { state: this.$state } };
                break;
        }
    }

    /**
     * 获取用户排名列表
     */
    rankList() {
        this.sorted = [];
        let arr = [];
        this.users.forEach(function (item, key, mapObj) {
            arr.push(key);
        });
        for (let i = 0; i < arr.length; i++) {
            if(this.users.get(arr[i]).score != 0){
                this.sorted.push(this.users.get(arr[i]));            
            }
        }
        this.sortUser();
        for (let uo of this.sorted) {
            if (uo.score <= 0 || uo.rank <= 0) {
                continue;
            }
            if (uo.rank == 1) {
                uo.bonus = Math.ceil(this.prop * 0.012) + 80;
            }
            else if (uo.rank == 2) {
                uo.bonus = Math.ceil(this.prop * 0.01) + 60;
            }
            else if (uo.rank == 3) {
                uo.bonus = Math.ceil(this.prop * 0.008) + 50;
            }
            else if (uo.rank == 4) {
                uo.bonus = Math.ceil(this.prop * 0.006) + 40;
            }
            else if (uo.rank == 5) {
                uo.bonus = Math.ceil(this.prop * 0.005) + 30;
            }
            else if (uo.rank > 5 && uo.rank <= 10) {
                uo.bonus = Math.ceil(this.prop * 0.003) + 20;
            }
            else {
                uo.bonus = Math.ceil(this.prop * 0.001) + 10;
            }
        }
        return this.sorted;
    }
    /**
     * 获取前100位排名
     * @param {*} domain 
     * @param {*} openid 
     */
    async getList(domain, openid) {
        let uinfo = this.users.get(`${domain}.${openid}`);
        if (!!uinfo) {
            return {
                list: this.sorted.slice(0, 100),
                user: {
                    name: uinfo.name,
                    icon: uinfo.icon,
                    score: uinfo.score,
                    rank: uinfo.rank,
                    bonus: uinfo.bonus,
                }
            };
        }
        else {
            return {
                list: this.sorted.slice(0, 100)
            };
        }
    }

    /**
     * 发放排行奖励
     */
    async getBonus() {
        let sorted = this.rankList();
        for (let uo of sorted) {
            if (uo.score <= 0 || uo.rank <= 0) {
                continue;
            }

            let si = await this.core.getUserIndex(uo.domain, uo.openid);
            if (!si) {
                continue;
            }
            if(uo.bonus != 0){
                let bonus = [{ type: ResType.Diamond, num: uo.bonus }];
                let msg = { type: NotifyType.DailyActivityBonus, info: { bonus: bonus, rank: uo.rank } };
                //向用户发送一封邮件
                this.core.remoteCall('remote.userNotify', {
                    domain: uo.domain,
                    openid: uo.openid,
                    msg: msg
                }, null, si);
            }
        }
    }

    /**
     * 检测活动状态
     */
    checkStatus() {
        let cur = new Date();
        if (!!this.id) {
            if (this.id != cur.getFullYear() * 10000 + cur.getMonth() * 100 + cur.getDate() && cur.getHours() >= 12) {
                this.clearActivityInfo();//清空活动信息                
                this.id = cur.getFullYear() * 10000 + cur.getMonth() * 100 + cur.getDate();
                this.$state = DailyActivityStatus.Idle;
            }
        }
        else {
            this.id = cur.getFullYear() * 10000 + cur.getMonth() * 100 + cur.getDate();
        }

        let ready = (cur.getHours() < 18 && cur.getHours() >= 12) ? true : false;        //12点至18点为Ready
        let active = (cur.getHours() < 19 && cur.getHours() >= 18) ? true : false;      //18点至19点为Active
        let bonus = (cur.getHours() < 12 || cur.getHours() >= 19) ? true : false;       //19点至第二天12点为奖励展示阶段   
        switch (this.$state) {
            case DailyActivityStatus.Idle:
                this.$state = DailyActivityStatus.Ready;                
                break;
            case DailyActivityStatus.Ready:
                if (!ready) {
                    this.$state = DailyActivityStatus.Active;
                }
                break;

            case DailyActivityStatus.Active:
                this.rankList();
                if (!active) {
                    this.$state = DailyActivityStatus.Bonus;
                    this.getBonus();               
                }
                break;

            case DailyActivityStatus.Bonus:
                this.rankList();
                if(!bonus){
                    this.$state = DailyActivityStatus.Ready;                
                }
                break;
            default:
                this.$state = DailyActivityStatus.Idle;                
                break;
        }
    }
    /**
     * 检测活动按钮开启状态
     */
    async CheckButtonStatus(domain, openid) {
        let ui = await this.core.getUserIndex(domain, openid);
        if (!!ui) {
            let cur = new Date();
            if (this.$state == DailyActivityStatus.Idle) {
                this.core.remoteCall('remote.userNotify', {
                    domain: domain,
                    openid: openid,
                    msg: { type: NotifyType.DailyActivityState, info: { status: "close" } }
                }, null, ui);
            }
            else {
                let cd = (Date.parse(new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), 18, 0, 0)) - Date.parse(cur)) / 1000;//活动开始倒计时
                if (this.$state != DailyActivityStatus.Ready) {
                    cd = 0;
                }
                this.core.remoteCall('remote.userNotify', {
                    domain: domain,
                    openid: openid,
                    msg: { type: NotifyType.DailyActivityState, info: { status: "open", cd: cd } }
                }, null, ui);
            }
        }
    }
}

module.exports = dailyactivity;