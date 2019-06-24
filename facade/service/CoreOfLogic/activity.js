let facade = require('../../Facade')
let {EntityType, ReturnCode, ActivityScoreRate, ActivityType, ActivityStatus, ActivityRankMax} = facade.const
let UserEntity = facade.entities.UserEntity
let CoreOfBase = facade.CoreOfBase

/**
 * 活动管理类
 */
class activity extends facade.Service
{
    /**
     * 构造函数
     * @param {CoreOfBase} core
     */
    constructor(core){
        super(core, {
            init: ActivityStatus.Idle,
            transitions: [
                { name: 'setToActive', from: ActivityStatus.Idle,  to: ActivityStatus.Active },                 //系统启动，初始化对象
                { name: 'setToBonus', from: ActivityStatus.Idle,  to: ActivityStatus.Bonus },                   //系统启动，初始化对象
                { name: 'end', from: ActivityStatus.Active, to: ActivityStatus.Bonus },                         //活动结束，系统兑奖
                { name: 'start', from: [ActivityStatus.Bonus, ActivityStatus.Idle], to: ActivityStatus.Active },//系统重新开启
            ],
            methods: {
                onSetToActive: (event, id, type)=>{
                    this.users = new Map();                         //参与活动的用户列表
                    this.sorted = [];                               //排位表
                    this._id = id;                                  //设置活动编号
                    this._type = type;                              //设置活动类型
                },
                onSetToBonus: (event, id, type)=>{
                    this.users = new Map();                         //参与活动的用户列表
                    this.sorted = [];                               //排位表
                    this._id = id;                                  //设置活动编号
                    this._type = type;                              //设置活动类型
                },
                onStart: () => {
                    this.users = new Map();                         //参与活动的用户列表
                    this.sorted = [];                               //排位表
                    this._id = this.getActivityId();                //设置活动编号
                    this._type = this._id % ActivityType.len;       //设置活动类型

                    this.Save();
                },
                onEnd:   () => {
                    //发放排行奖励
                    for(let uo of this.sorted){
                        if(uo.rank <= 0 || uo.rank > ActivityRankMax){
                            continue;
                        }

                        for(let rank in this.core.fileMap.activity.ActivityRankBonus[this.type]){
                            if(uo.rank <= rank){
                                //发放奖励，并下行奖励通知 - 改为事件模式
                                let user = this.core.GetObject(EntityType.User, uo.uid);
                                if(!!user){
                                    this.core.notifyEvent("user.Activity.RankBonus", {user:user, rank: rank});
                                }
                                break;
                            }
                        }
                    }

                    this.Save();
                },
            }
        });
        this.core = core;
    }

    /**
     * 将活动信息存入数据库
     */
    Save(){
        this.sysObj.activity = JSON.stringify(this.getInfo());
        this.sysObj.save();
    }

    /**
     * 用户领取活动奖励
     * @param {UserEntity} $user
     * @param {*} $id
     */
    getBonus($user, $id){
        let $ui = this.users.get($user.id);
        if(!$ui){
            return {code: ReturnCode.activityNoRankBonus};
        }

        if($id == 0){ //领取排名奖
            if($ui.rank <=0 || $ui.rank > ActivityRankMax){
                return {code: ReturnCode.activityNoRankBonus};
            }

            for(let rank in this.core.fileMap.activity.ActivityRankBonus[this.type]){
                if($ui.rank <= rank){
                    if(!$user.baseMgr.vip.readActivityBonus(0)){
                        $user.baseMgr.vip.writeActivityBonus(0);
                        $user.getBonus(this.core.fileMap.activity.ActivityRankBonus[this.type][rank].bonus);
                        return {code: ReturnCode.Success, data:{rank: $ui.rank, bonus:this.core.fileMap.activity.ActivityRankBonus[this.type][rank].bonus}};
                    }
                    else{
                        return {code: ReturnCode.activityBonusGot};
                    }
                }
            }
        }
        else{//领取分段积分奖
            if($id - 1 <= $ui.lv){
                if(!$user.baseMgr.vip.readActivityBonus($id)){
                    $user.baseMgr.vip.writeActivityBonus($id);
                    $user.getBonus(this.core.fileMap.activity.ActivityScoreBonus[this.type][$id - 1].bonus);
                    return {code: ReturnCode.Success, data:{id: $id, bonus:this.core.fileMap.activity.ActivityScoreBonus[this.type][$id - 1].bonus}};
                }
                else{
                    return {code: ReturnCode.activityBonusGot};
                }
            }
        }
        return {code: ReturnCode.illegalData};
    }

    /**
     * 获取活动状态参数
     */
    getInfo($user){
        let time = new Date();
        let nowday = 1;
        if(time.getDay() == 0){
            nowday = 7;
        }
        else {
            nowday = time.getDay();
        }
        let start = time.getDate() - nowday + 1;
        let end = time.getDate() + (7 - nowday) - 1;
        let starttime = String(time.getFullYear())+"/"+String(time.getMonth()+1)+"/"+String(start);
        let endtime = String(time.getFullYear())+"/"+String(time.getMonth()+1)+"/"+String(end);
        let actarr = [0,0,0,0,0,0];

        if(!!$user){
            for(let i = 0; i< 6; i++){
                if($user.baseMgr.vip.v.act[i] == true){
                    actarr[i] = 1;
                }
            }
            let ui = this.users.get($user.id);
            return {
                id: this.id,
                type: this.type,
                state: this.state,
                starttime: starttime,
                endtime: endtime,
                score: !!ui ? ui.score : 0,         //当前积分
                rank: !!ui ? ui.rank : 0,           //当前排名
                act: actarr        //历史领奖记录
            };
        }
        else{
            return {
                id: this.id,
                type: this.type,
                state: this.state,
                starttime: starttime,
                endtime: endtime
            };
        }
    }

    /**
     * 从数据库载入活动信息
     */
    async loadDb(){
        let it = await facade.models.system(this.core.options.mysql).findCreateFind({
            where:{
                id:1
            },
            defaults: {activity:"{}"},
        });
        this.sysObj = it[0];
        let $info = JSON.parse(this.sysObj.activity);
        if(!!$info.id){ //存在历史活动信息
            if($info.state == ActivityStatus.Active){
                this.setToActive($info.id, $info.type);
            }
            else if($info.state == ActivityStatus.Bonus){
                this.setToBonus($info.id, $info.type);
            }
        }

        this.checkStatus(true);
    }

    /**
     * 活动编号
     */
    get id(){
        return this._id;
    }

    /**
     * 活动类型
     */
    get type(){
        return this._type;
    }

    /**
     * 获取或自动创建排行榜用户信息对象，并进行必要的数据检测
     * @param {*}
     */
    getUserOrDefault($uid){
        if(!this.users.has($uid)){//如果不存在指定记录，就创建一条新记录
            let uo = this.core.GetObject(EntityType.User, $uid);
            if(!!uo){
                this.users.set($uid, {
                    uid:$uid,       //玩家ID
                    aid:this.id,    //活动ID
                    openid: uo.openid,
                    name: uo.name,
                    icon: uo.baseMgr.info.GetHeadIcon(),
                    score:0,        //活动积分
                    lv:0,           //分段积分进度
                    rank:0,         //排名，0表示未上榜
                });
                this.sorted.push(this.users.get($uid)); //添加到排序列表中
            }
        }
        let ui = this.users.get($uid);
        if(!!ui){
            if(ui.aid != this.id){//现有记录的活动ID和当前活动ID不符
                ui.aid = this.id; //重新设置活动ID
                ui.score = 0;     //分数清零
                ui.lv = 0;        //分段积分进度清零
            }
        }
        return ui;
    }

    /**
     * 获取用户排名列表, 传入页数
     */
    rankList($uid) {
        let $rank = 0;
        let ui = this.users.get($uid);
        if(!!ui){
            $rank = ui.rank;
        }
        let ret = {list:[]};
        //todo:自身排名判断，若自身排名在前14名以内则改为获取前14名，若排行不足14位则显示全部
        if (this.sorted.length >= 14) {
            if($rank == 0){ //没有排名，显示前14名
                for (let j = 0; j < 14; j++) {
                    ret.list.push(this.sorted[j]);
                }
            }
            else if ($rank > 13) {//在14名外
                for (let j = 0; j < 3; j++) {
                    ret.list.push(this.sorted[j]);
                }
                for (let j = $rank - 5; j < $rank + 6; j++) {
                    ret.list.push(this.sorted[j]);
                }
            }
            else {//在14名以内
                for (let j = 0; j < 14; j++) {
                    ret.list.push(this.sorted[j]);
                }
            }
        }
        else { //总参与用户不足14，全部显示
            for (let j = 0; j < this.sorted.length; j++) {
                ret.list.push(this.sorted[j]);
            }
        }
        return ret;
    }

    /**
     * 定时检测当前活动是否有效，并执行相关操作：
     * @note
     *  1、每周一零点，自动生成新的一期互动，自动编号、设定类型。
     *  2、玩家通过游戏环节累积积分，当积分达到分段积分各个标准时，实时、自动下发积分奖励。玩家可以在活动界面看到各阶段的奖励内容，以及各段激活情况
     *  3、周六晚9点自动结算活动排名奖励，奖励自动发放到用户背包，玩家可以在活动界面上看到自己实时或最终排名，排行榜上各个玩家的获奖情况
     *  4、结算活动后，本期活动结束，活动信息保留供用所有玩家查看，直至下一期活动开启，周天轮休。
     */
    checkStatus($init){
        //判断并推动状态机演变
        let cur = new Date();
        if(!$init){ //定时检测而非初次载入数据库信息时，需要对数据进行重新排序
            this.sortUser();
        }
        switch(this.state){
            case ActivityStatus.Active:

                //如果时间大于周六晚上9点则立即结算
                if((cur.getDay() == 6 && cur.getHours()>=21) || cur.getDay() == 0){
                    this.end();
                }
                break;
            case ActivityStatus.Bonus:
                //如果时间大于周一零点则立即重启活动
                if(cur.getDay() != 0){
                    if((cur.getDay() == 6 && cur.getHours()>=21) ) return;
                    this.start();
                }
                break;

            default:
                this.start();//状态机重启
                break;
        }
    }

    /**
     * 对参与活动的用户进行排序
     */
    sortUser(){
        let rank = 1;
        this.sorted.sort((a,b)=>{
            return b.score - a.score;
        });
        this.sorted.map(item=>{
            item.rank = rank++;
        });
    }

    /**
     * 设置玩家活动分数，用于数据库载入
     * @param {*}
     * @param {*}
     * @param {*}
     * @param {*}
     */
    setScore(user, $aid, $score, $lv){
        if($aid == this.id && $score > 0){ //否则就不加入列表中
            let ui = this.getUserOrDefault(user.id);
            ui.score = $score;
            if(!!$lv){
                ui.lv = $lv;
            }
        }
    }

    /**
     * 为指定用户添加积分
     * @param {*}
     * @param {*}
     */
    addScore($uid, $type, $added){
        if($type != this.type || this.state != ActivityStatus.Active) {//类型不匹配，或者活动处于非激活状态
            return;
        }

        $added = $added || 0;
        if(typeof $added == "string"){
            $added = parseInt($added);
        }
        if($added <= 0){
            return;
        }

        let ui = this.getUserOrDefault($uid);
        let user = this.core.GetObject(EntityType.User, $uid);
        if(!!user){
            ui.score += $added * ActivityScoreRate[this.type]; //不同活动具有不同的分数转化率
            for(let i = 0;i < 5;i++){
                if(!!this.core.fileMap.activity.ActivityScoreBonus[this.type][i] && ui.score >= this.core.fileMap.activity.ActivityScoreBonus[this.type][i].score){
                    ui.lv = i;
                }
            }
            this.core.notifyEvent("user.Activity.ScoreBonus", {user:user, score: ui.score, lv: ui.lv});
            //活动积分发生变化
            this.core.notifyEvent("user.Activity.ScoreChanged", {user:user, score: ui.score, lv: ui.lv});
        }
    }

    /**
     * 获得当前时间对应的活动编号
     */
    getActivityId(){
        let now = new Date();
        return this.getYear(now)*100 + this.getWeekNumber(now);
    }

    /**
     * 获取当前年份
     * @param {*} now
     */
    getYear(now){
        return now.getFullYear();
    }

    /**
     * 计算当前日期是一年中的第几周
     */
    getWeekNumber(now) {
        /**
         * 判断年份是否为润年
         *
         * @param {Number} year
         */
        function isLeapYear(year) {
            return (year % 400 == 0) || (year % 4 == 0 && year % 100 != 0);
        }
        /**
         * 获取某一年份的某一月份的天数
         *
         * @param {Number} year
         * @param {Number} month
         */
        function getMonthDays(year, month) {
            return [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month] || (isLeapYear(year) ? 29 : 28);
        }

        let year = now.getFullYear(),
            month = now.getMonth(),
            days = now.getDate();

        //那一天是那一年中的第多少天
        for (var i = 0; i < month; i++) {
            days += getMonthDays(year, i);
        }

        //那一年第一天是星期几
        var yearFirstDay = new Date(year, 0, 1).getDay() || 7;

        var week = null;
        if (yearFirstDay == 1) {
            week = Math.ceil(days / yearFirstDay);
        } else {
            days -= (7 - yearFirstDay + 1);
            week = Math.ceil(days / 7) + 1;
        }

        return week;
    }
}

module.exports = activity;