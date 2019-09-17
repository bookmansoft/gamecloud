let facade = require('../../../../Facade')
let CommonFunc = facade.util
let LargeNumberCalculator = facade.Util.LargeNumberCalculator
let {UserVipLevelSetting, em_UserVipLevel, EntityType,IndexType, ResType, RankType, em_Effect_Comm, em_Condition_Type,em_Condition_Checkmode, UserStatus, ReturnCode} = facade.const
let BonusObject = facade.Util.BonusObject;
let EffectManager = facade.Util.EffectManager;
let ChatPrivateManager = facade.Util.ChatPrivateManager;
let TaskManager = require('../assistant/task')
let potential =  require('../assistant/potential')
let shopInfo =  require('../assistant/shopInfo')
let tollgate =  require('../assistant/tollgate')
let action =  require('../assistant/action')
let info =  require('../assistant/info')
let randomEvent =  require('../assistant/randomEvent')
let item = require('../assistant/item')
let vip = require('../assistant/vip')
let {User} = require('../table/User')
let InviteManager = require('../assistant/InviteMgr')
let BaseEntity = facade.BaseEntity
const crypto = require('crypto');

//@warning 如果在 BaseUserEntity 的静态方法中，用 this.preList 形式使用，会造成 BaseUserEntity 的子类无法访问，因此前置为全局变量
let preList = {};

/**
 * 用户对象，对来自Model的User进一步封装
 */
class BaseUserEntity extends BaseEntity
{
    /**
     * 构造函数
     * @param {User} user 
     */
	constructor(user, core){
        super(user, core);

        if(user.domain == ""){
            user.domain = "official";
        }

        this.privateChatMgr = new ChatPrivateManager(this);

		this.time = 0;
		this.sign = '';
		this.appId = '';
		this.serverId = '';

		//region 腾讯大厅
		this.openkey = '';//这个值是有时效的，所以不保存入数据库，每次去获取
		this.pf = '';//标识腾讯的来源渠道
		//endregion

        //region 载入assistant对象
        this.baseMgr = {};

        for(let cls of core.GetInheritArray()) {
            facade.config.filelist.mapPackagePath(`${__dirname}/../../../${cls}/model/assistant`).map(srv=>{
                let srvObj = require(srv.path);
                this.baseMgr[srv.name.split('.')[0]] = new srvObj(this);
            });
            if(facade.addition) {
                facade.config.filelist.mapPath(`app/core/${cls}/model/assistant`, false).map(srv=>{
                    let srvObj = require(srv.path);
                    this.baseMgr[srv.name.split('.')[0]] = new srvObj(this);
                });
            }
        }
        //endregion
        
        //利用反序列化对象，填充各个成员对象
        Object.keys(this.baseMgr).map($key=>{
            let $value = this.baseMgr[$key];
            $value.LoadData(this.orm[$value.attribute]);
        });

        this.getInfoMgr().v.id = this.orm.id;

		//效果管理器
        this.effectMgr = new EffectManager();
    }

    /**
     * 固定时间间隔的滴答操作，由底层自动调用
     */
    tick() {
        this.baseMgr.vip.checkSweep(); //检测扫荡是否结束，如果结束则自动计算奖励
        this.baseMgr.slave.CheckStatus(); //释放到期奴隶，或者解放自身
    }

    /**
     * 广播消息给所有好友
     */
    socialBroadcast(msg){
        Object.keys(this.getTxFriendMgr().friends).map(openid=>{
            this.socialNotify(msg, openid);
        });
    }

    DelegateByOpenid(cb, openid){
        if(!openid || openid == this.openid) {
            cb(this);
        } else {
            let cls = this.domainClass();
            let fid = !!cls ? `${this.domainType}.${cls}.${openid}` : `${this.domainType}.${openid}`;
            let friend = this.core.GetObject(EntityType.User, fid,IndexType.Domain);
            if(!!friend) {
                cb(friend);
            }
        }
    }

    /**
     * 待路由的社交类消息
     * @param {*} msg       消息体
     * @param {*} openid    收件人，填空为发给自己
     */
    socialNotify(msg, openid){
        if(!openid || this.openid == openid){//发送给自己
            this.core.notifyEvent('user.socialMsg', {user: this, data: msg});
        } else {
            let cls = this.domainClass();
            let domain = !!cls ? `${this.domainType}.${cls}` : this.domainType;
            let friend = this.core.GetObject(EntityType.User, `${domain}.${openid}`, IndexType.Domain);
            if(!!friend){
                //发送给同服的好友
                this.core.notifyEvent('user.socialMsg', {user: friend, data: msg});
            } else {
                //通过路由模式，发送给不同服的好友
                this.core.remoteCall('routeCommand', {func: 'userNotify', domain: domain, openid: openid, msg: msg});
            }
        }
    }

    /**
     * 获取当前用户的领域类型
     */
    get domainType() {
        return this.domain.split('.')[0];
    }
    get domainClass() {
        return this.domain.split('.')[1];
    }

    /**
     * 向客户端推送消息,格式固定为:{type, info}，其中type为推送消息类型，引用自NotifyType, info为推送消息内容
     * @param msg  
     *
     * @note
     *      原始消息为msg，抛出时包裹了socket信息，实际下发时会自动剥离，最终下发的消息仍旧为原始msg
     */
    notify(msg){
        this.core.notifyEvent('socket.userNotify', {sid: this.socket, msg: msg});
    }

    /**
     * 发放奖励
     * @param {*} bonus     奖励内容
     * @param {*} convert   是否进行前置转换，这是为了适应形如"1,2;3,4"这样的简约型字符串
     */
    getBonus(bonus, convert=false){
        if(!!convert){
            bonus = BonusObject.convert(bonus);
        }
        BonusObject.getBonus(this, bonus);
    }

    /**
     * 同步链上道具
     * @param {Array} props 
     */
    syncProps(props){
        if(!props){
            return ;
        }
        BonusObject.authChain(this,props);
    }

    /**
	 * 设置最后刷新日期
	 * @param {*}  
	 */
	setRefreshDate($val){
		this.baseMgr.info.v.date = $val;
        this.baseMgr.info.dirty = true;
	}
	/**
	 * 读取最后刷新日期
	 */
	getRefreshDate(){
		return this.baseMgr.info.v.date;
	}

    //  写入附加信息
    WriteUserInfo(_appId, _serverId, _time, _sign){
    	this.dirty = true;
        this.appId = _appId;
        this.serverId = _serverId;
        this.sign = _sign;
        this.time = _time;
    };

	get id(){
    	return !!this.orm ? this.orm.id : 0;
	}
	get name(){
        return !!this.orm ? this.orm.name : '';
	}
	set name(val){
        if(!!this.orm){
            this.orm.name = val;
            this.dirty = true;
        }
	}
	get domain(){
        return !!this.orm ? this.orm.domain : '';
    }
    get diamond(){
        return !!this.orm ? this.orm.diamond : 0;
    }
    set diamond(val){
        if(!!this.orm){
            this.orm.diamond = parseInt(val);
            this.dirty = true;
        }
    }
    /**
     * 在微信环境下，实际存放的是 unionid
     */
	get openid(){
		return this.orm.uuid;
	}
	set openid(val){
		this.orm.uuid = val;
		this.dirty = true;
    }
    /**
     * 读取微信环境下原始的 openid ，因为微信支付接口要求提交 openid 而不能是 unionid
     */
    get openidOri() {
        return this.baseMgr.info.getAttr('openid');
    }
    /**
     * 读取用户账号
     */
    get account() {
        return this.$account;
    }
    get domainId() {
        return this.$domainId;
    }
    set domainId(val) {
        this.$domainId = val;
        this.$account = crypto.createHash('sha1').update(Buffer.from(val,'utf8')).digest().toString('hex');
    }

    /**
     * 历史最高关卡
     * @returns {number}
     */
    get hisGateNo(){
        return this.orm.hisGateNo || 1;
    }
    set hisGateNo(val){
        this.orm.hisGateNo = parseInt(val || 1);

        this.dirty = true;
        this.core.notifyEvent('user.newAttr', {user:this, attr:{type:'hisGateNo', value:val}});
    }

    /**
     * 历史最高分数
     */
    get score(){
        return this.orm.score || 0;
    }
    set score(val){
        this.orm.score = parseInt(val || 0);

        this.dirty = true;
        //广播属性变化事件
        this.core.notifyEvent('user.newAttr', {user:this, attr:{type:'score', value:val}});
    }

    //腾讯大厅
    GetOpenKey() {
		if (this.baseMgr.txInfo && this.baseMgr.txInfo.GetOpenKey()) {
			return this.baseMgr.txInfo.GetOpenKey();
		}
		return this.openkey;
	}
    SetOpenKey(openkey) {
		this.openkey = openkey;
		if (this.baseMgr.txInfo) {
			this.baseMgr.txInfo.SetOpenKey(openkey);
		}
	}
    GetPf () {
		if (this.baseMgr.txInfo && this.baseMgr.txInfo.GetPf()) {
			return this.baseMgr.txInfo.GetPf();
		}
		return this.pf;
	}
    SetPf(pf) {
		this.pf = pf;
		if (this.baseMgr.txInfo) {
			this.baseMgr.txInfo.SetPf(pf);
		}
	}
	//设置腾讯会员信息
    async SetTxInfo(txuserdata) {
		if (this.baseMgr.txInfo) {
			if (txuserdata) {
                let nw = [];
				if (txuserdata.openkey != undefined) {
					this.SetOpenKey(txuserdata.openkey);
					this.baseMgr.txInfo.SetOpenKey(txuserdata.openkey);
				}
				if (txuserdata.pf != undefined) {
					this.SetPf(txuserdata.pf);
					this.baseMgr.txInfo.SetPf(txuserdata.pf);
				}
				if (txuserdata.nickname != undefined) {
                    let nm = encodeURIComponent(txuserdata.nickname); //转码
                    this.name = nm;

                    nw.push({type:'name', value:nm});//更新名称
				}
				if (txuserdata.gender != undefined) {
					this.baseMgr.txInfo.SetGender(txuserdata.gender);
				}
				if (txuserdata.figureurl != undefined && txuserdata.figureurl != "") {
                    this.orm.pet = this.core.urlToCdn(txuserdata.figureurl); //保存到数据库pet字段

                    nw.push({type:'icon', value:this.orm.pet});//更新头像

					this.baseMgr.txInfo.SetFigureurl(this.orm.pet);
					this.baseMgr.info.SetHeadIcon(this.orm.pet);
				}
				if (txuserdata.is_blue_vip != undefined) {
					this.baseMgr.txInfo.SetBlueVip(txuserdata.is_blue_vip);
				}
				if (txuserdata.is_blue_year_vip != undefined) {
					this.baseMgr.txInfo.SetBlueYearVip(txuserdata.is_blue_year_vip);
				}
				if (txuserdata.blue_vip_level != undefined) {
					this.baseMgr.txInfo.SetBlueVipLevel(txuserdata.blue_vip_level);
				}
				if (txuserdata.is_super_blue_vip != undefined) {
					this.baseMgr.txInfo.SetSuperBlueVip(txuserdata.is_super_blue_vip);
                }

                if(nw.length > 0){
                    this.core.notifyEvent('user.newAttr', {user:this, attr:nw});//发送"更新名称"事件
                }
			}
		}
	}
    //腾讯大厅 end

    //	获取
    GetInfo() {
		let ret = {};
		Object.keys(this.baseMgr).map($key=>{
            ret[this.baseMgr[$key].attribute] = this.baseMgr[$key].GetData();
        });

		return ret;
    }

    /**
     * 检测邮箱状态
     */
    CheckMailboxState(){
        let mb = this.core.GetMapping(EntityType.Mail).groupOf(this.openid).where([['state', 0]]).records();
        if(mb.length == 0){
            this.getInfoMgr().UnsetStatus(UserStatus.newMsg, false); 
        }
        else{
            this.getInfoMgr().SetStatus(UserStatus.newMsg, false); 
        }
    }
    
    /**
     * 将变动的数值持久化到数据库
	 * @note 只在最关键如支付时直接调用，一般依赖脏数据检测自动调用
     */
    Save () {
		let isDirty = this.dirty;
        this.dirty = false;

        //由于VIP状态以复合形式存储于basemgr.info的status字段中，而真实状态却是由baseMgr.vip内存储的有效时间决定的，所以此处强制检测以使两者同步
        if(this.getVipMgr().valid){
            if(!this.getInfoMgr().CheckStatus(UserStatus.isVip)){
                this.getInfoMgr().SetStatus(UserStatus.isVip);
            }
        }
        else {
            if(this.getInfoMgr().CheckStatus(UserStatus.isVip)){
                this.getInfoMgr().UnsetStatus(UserStatus.isVip);
            }
        }

        for(let $key in this.baseMgr) {
            if(this.baseMgr[$key].attribute) {
                if(this.dirty || this.baseMgr[$key].dirty) {
                    let newstr = this.baseMgr[$key].ToString(); //内置错误控制：如果辅助字段序列化后超长则禁止写库，避免对其它字段造成干扰
                    if(!!newstr) {
                        this.orm[this.baseMgr[$key].attribute] = newstr;
                        isDirty = true;
                    }
                }
            }
		}

        if(isDirty){
            this.orm.save().catch(e=>{
                console.error(e);
            });
        }
    }

    /**
     * 检测和跨天相关的数据
     * @param day       //检测日期
     */
    checkDailyData(day){
        if(day != this.getRefreshDate()){//跨天登录
            //改写最后登录日期
            this.setRefreshDate(day);

            //重置每日任务
            this.baseMgr.task.InitDailyTask();
            //重置行为限制对象
            this.getActionMgr().Reset();
            //清除每日社交互动数据
            this.getTxFriendMgr().DailyRefresh();

            //登记回头率
            let t1 = Date.parse(this.orm.createdAt.toDateString())/1000;
            let t2 = Date.parse(day)/1000;
            let tp = ((t2-t1)/(3600*24)) | 0;
            this.core.notifyEvent('user.relogin', {user:this, data:{type:tp, time:day}})
        }
    }

    /**
     * 获取寻敌界面所需显示的信息
     * @return {Object}
     */
    GetIntro() {
        return {'id': this.id, 'name': this.name, 'power': 100};
    }

    /**
     * @return {TaskManager}
     */
    getTaskMgr(){
        return this.baseMgr.task;
    }
    /**
     * @return {tollgate}
     */
    getTollgateMgr() {
        return this.baseMgr.tollgate;
    }

    /**
     * @return {txFriend}
     */
    getTxFriendMgr(){
        return this.baseMgr.txFriend;
    }
    /**
     * all events happened on exploring
     * @return {randomEvent}
     */
    getEventMgr() {
        return this.baseMgr.randomEvent;
    }

    /**
     * @return {info}
     */
    getInfoMgr(){
        return this.baseMgr.info;
    }
    /**
     * @return {action}
     */
    getActionMgr() {
        return this.baseMgr.action;
    }
    /**
     * @return {item}
     */
    getPocket(){
        return this.baseMgr.item;
    }

    /**
     * @return {vip}
     */
    getVipMgr(){
        return this.baseMgr.vip;
    }
    /**
     * @return {InviteManager}
     */
    getInviteMgr() {
        return this.baseMgr.InviteMgr;
    }

    /**
     * 访问天赋管理对象
     * @return {potential}
     */
    getPotentialMgr() {
        return this.baseMgr.potential;
    }

    /**
     * 返回时效类特效对象
     * @return {EffectTimerManager}
     */
    getTimeEffect() {
        return this.baseMgr.TimeEffect;
    }

    /**
     * @return {shopInfo}
     */
    getShopInfo(){
        return this.baseMgr.shopInfo;
    }

    /**
     * 返回IEffect接口要求的EffectManager对象
     * @param {Number} $nl
     * @return {EffectManager}
     */
    effect($nl = 0) {
        //检测下级效果器是否发生了变更
        let $te = this.getTimeEffect().ClearExpired();
        let $pe = this.getPotentialMgr().effect($nl);
        if(this.baseMgr.vip.effect().GetEffectChanged() || $te.GetEffectChanged() || $pe.GetEffectChanged()) {//重新计算效果列表 将下级效果器设为未更改
            //清理所有效果，以便重新计算
            this.effectMgr.Clear()
                //将效果器本身设为已更改, 以便更上层的效果器能够感知变化
                .SetEffectChanged(true)
                //添加动态效果
                .Add(this.baseMgr.vip.effect().SetEffectChanged(false))
                .Add($te.SetEffectChanged(false))
                //增加图腾/法宝/宠物的效果
                .Add($pe.SetEffectChanged(false));
                //todo: 添加来自其他方面的效果
                //...
        }
        return this.effectMgr;
    }
    /**
     * @return {Object} Dictionary of EffectObject
     */
    getEffect(){
        return this.effect().effectList;
    }

    /**
     * 根据效果类型和初始值，计算加持后的结果
     * @param {Number} $effectType
     * @param {*} $oriValue
     * @return {*}
     */
    CalcResult($effectType, $oriValue) {
        return this.effect().CalcFinallyValue($effectType, $oriValue);
    }

    /**
     * 获取当前战力
     * @return {LargeNumberCalculator}
     */
    getPower() {
        let $ret = this.getPotentialMgr().getPower();
        //添加图腾对圣光加成的加持
        $ret = $ret.CalcFinallyValue(this.effect(), [em_Effect_Comm.PotentialEffect]);
        //添加科技对战力的加持
        $ret = $ret.CalcFinallyValue(this.effect(), [em_Effect_Comm.Attack, em_Effect_Comm.AttackAndClick]);
        //添加宠物科技的影响：和转生正相关的攻击加成
        $ret = $ret._mul_(1 + this.effect().CalcFinallyValue(em_Effect_Comm.AttackForPveRevival, 0) * this.getTollgateMgr().revivalNum);
        //添加内丹（英魂）对战力的加持
        $ret = $ret._mul_(1 + this.effect().CalcFinallyValue(em_Effect_Comm.StoneEffect, this.getPocket().GetRes(ResType.StoneHero)*(0.1 + 0.005*this.getTollgateMgr().revivalNum)));
        // //检测战力等级：战力等级为战力指数/10
        // this.core.notifyEvent('user.task', {user:this, data:{type:em_Condition_Type.level, value:($ret.power/10)|0, mode:em_Condition_Checkmode.absolute}});
        //检测战力等级：战力等级为战力指数
        this.core.notifyEvent('user.task', {user:this, data:{type:em_Condition_Type.level, value:$ret.power|0, mode:em_Condition_Checkmode.absolute}});
        return $ret;
    }
    /**
     * @return {LargeNumberCalculator}
     */
    getClickPower() {
        let $ef = this.effect();
        let $eo = $ef[em_Effect_Comm.ConvertPveToClick];
        let $ret = this.getPotentialMgr().getClickPower();    //宠物带来的点击攻击力
        if($eo){
            //加上PVE伙伴攻击力转换为点击攻击力部分
            ret._add_(this.getPotentialMgr().getPower()._mul_($eo.value));
        }
        $ret.CalcFinallyValue($ef, [em_Effect_Comm.AttackForClick, em_Effect_Comm.AttackAndClick]); //再叠加外围的科技加成效果
        return $ret;
    }

    /**
     * 购买非商店类商品
     * @param {Number} $type
     * @param {Number} $num
     * @param {Boolean} $isExec
     * @return {Boolean}
     */
    purchase($type, $num, $isExec) {
        $num = Math.max(0, Math.min(5000, $num));//简单的范围控制
        if(!!this.core.fileMap.PurchaseConfig[$type]){
            let $sum = (this.core.fileMap.PurchaseConfig[$type]['price'] * $num) | 0;
            if(this.getPocket().GetRes(ResType.Diamond) >= $sum){
                if($sum > 0 && $isExec){
                    this.getPocket().AddRes(-$sum, true, ResType.Diamond);
                    this.dirty = true;
                    //todo 写日志 日志中的用户标志为sessionid
                    //(new Log({'content': "purchase:$type/$num/$sum", 'time': date("Y-m-d H:i:s",facade.util.now()), 'user': this.openid})).SaveAsync('memory'); //过时的写法
                }
                return true;
            }
        }
        return false;
    }

    /**
     * 添加一个动态效果对象，该对象必须设置表示有效期的时间戳，例如：
     *  this.AddTimer(new EffectObject(em_Effect_Comm::em_Effect_Action_Speed, 1, facade.util.now() + 60));
     *
     * @param {EffectObject} $obj ： 要添加的效果对象
     * @return {BaseUserEntity} ：返回自身，以支持链式操作
     */
    AddTimer($obj) {
        this.getTimeEffect().AddItem($obj);
        return this;
    }

    /**
     * 数据发生变化时的事件句柄
     */
    onUpdate(){
        this.core.notifyEvent('user.update', {user:this})
    }

    //region 集成Ranking接口时，必须具备的辅助函数，包括：ScoreOf rankParams IndexOf

    /**
     * 获取用于排名的分值
     * @param {*} type  排名模式
     */
    ScoreOf(type){
        switch(type){
            case RankType.battle:
                return this.score;
            default:
                return this.hisGateNo;
        }
    }

    /**
     * Ranking接口需要的参数设定
     */
    static get rankParams(){
        return {
            rankNumber: 5000,        //排行榜尺寸
        }
    }

    //endregion

    //region 集成Mapping接口时，必须具备的辅助函数

    /**
     * 索引值，用于配合Mapping类的索引/反向索引。
     * 
     * @note 集成Ranking接口时，也必须拥有此函数
     */
    IndexOf(type){
        switch(type){
            case IndexType.Domain:
                return this.domainId;
            case IndexType.Name:
                return this.name;
            case IndexType.Foreign:
                return this.openid;
            default:
                return this.orm.id;
        }
    }

    SetAttr(attr, val){
        this.orm[attr] = val;
        this.dirty = true;
    }

    GetAttr(attr){
        return this.orm[attr];
    }

    setAttr(attr, val){
        this.orm[attr] = val;
        this.dirty = true;
    }

    getAttr(attr){
        return this.orm[attr];
    }

    /**
     * 使用Mapping映射类时的配置参数
     */
    static get mapParams(){
        return {
            model: User,            //对应数据库单表的ORM封装
            entity: this,           //实体对象，在model之上做了多种业务封装
            etype: EntityType.User, //实体对象的类型
        };
    }

    /**
     * 创建时的回调函数
     * @param {*} userName  用户名称
     * @param {*} domain    用户归属域(证书发放方)
     * @param {*} openid    用户证书
     * @param {*} passway   是否预登录检测，例如，管理员登录Index服务器时不做预登录检测
     */
    static async onCreate(mysql, userName, domain, openid, passway) {
        try {
            if(!passway) {
                if(!this.authPreList(`${domain}.${openid}`, {openid:openid, domain:domain})) {
                    return null;
                }
            }

            let it = await User(mysql).findCreateFind({
                where:{
                    domain:domain,
                    uuid:openid
                },
                defaults: this.getDefaultValue(userName, domain),
            });
            return it[0];
        } catch(e) {
            console.error(e);
            return null;
        }
    }

    /**
     * 进行字典映射时的回调函数
     * @param {*} user 
     */
    static onMapping(user, core) {
        if(user.domain == ""){
            user.domain = "official";
        }

        let pUser = new core.entities.UserEntity(user, core);
        pUser.domainId = pUser.domain + '.' + pUser.openid;
        
        if((new Date()).toDateString() != pUser.getRefreshDate()) {//数据跨天
            pUser.getInfoMgr().v.scored = 0; //清空用户过期的每日榜分数，之所以修改info.v.scored而不是info.scored，是为了不在载入阶段触发排序事件
        }

        //添加VIP标志监控器，以便定时检测该标记是否失效
        if(pUser.getInfoMgr().CheckStatus(UserStatus.isVip) || pUser.getVipMgr().valid) {
            core.notifyEvent('user.update', {user:pUser});
        }

        if(user._options.isNewRecord) {//新创建的记录
            pUser.getInfoMgr().SetStatus(UserStatus.isNewbie, false);
        } else {//已有的记录
            pUser.getInfoMgr().UnsetStatus(UserStatus.isNewbie, false);
            //向排序管理器注册用户信息，标注为数据载入阶段，因此不会触发排序操作
            core.GetRanking(this).Update(pUser, true);
        }

        return pUser;
    }

    /**
     * 载入用户信息时的回调函数
     * @param {*} mysql
     * @param {*} callback 
     */
    static async onLoad(mysql, callback){
        try {
            let ret = await User(mysql).findAll();
            ret.map(it=>{
                callback(it);
            });
        } catch(e) {
            console.error(e);
        }
    }

    /**
     * 填充新用户默认注册信息
     * @param {*} userName 
     * @param {*} domain 
     */
    static getDefaultValue(userName, domain){
        return {
            name:userName,
            info:`{"name": "", "id": 0, "domain":"${domain}", "ap": 0,"money": 0, "diamond":0, "rank": 0,"status": 0}`,
            task:'',
            login: '{}',
            item: '{}',
            txinfo: '{"openid": "","openkey": "","pf": "","nickname": "","gender": "","figureurl": ""}',
            txFriend: '{"friendList": {}}',
        };
    }
    //endregion

    /**
     * 验证索引服预注册信息
     * @param {*} id 
     * @param {*} obj 
     */
    static authPreList(id, obj){
        let ret = true;
        if(!preList 
            || !preList[id]
            || preList[id].openid != obj.openid
            || preList[id].domain != obj.domain) {
            ret = false;
        }

        if(!!preList[id] && (CommonFunc.now() - preList[id].time) > 3600*2) {
            delete preList[id];
            ret = false;
        }

        return ret;
    }

    /**
     * 索引服通知预注册
     * @param {Object} oemInfo
     */
    static preLogin(oemInfo){
        if(!preList){
            preList = {};//用户预注册列表 - 索引服和逻辑服之间数据校验用
        }

        oemInfo.time = CommonFunc.now();
        
        preList[`${oemInfo.domain}.${oemInfo.openid}`] = oemInfo;
        return {code: ReturnCode.Success};
    }

    /**
     * 根据用户经验返回相应的VIP等级
     */
    static GetVipLevel($exp) {
        let $ret = em_UserVipLevel.Normal;
        for(let $key in UserVipLevelSetting){
            if($exp >= UserVipLevelSetting[$key]){
                $ret = $key;
                continue;
            }
            else{
                break;
            }
        }
        return $ret;
    }
}

exports = module.exports = BaseUserEntity;
