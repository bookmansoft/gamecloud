let facade = require('../../../facade/Facade')
let {EntityType, IndexType, AllyPower, InviteType, AllyNewsType, ReturnCode} = facade.const
let UserEntity = facade.entities.UserEntity
let {ally} = require('../table/ally')
let BaseEntity = require('../BaseEntity')

/**
 * 分页显示联盟排行时，每页显示的条目数量
 */
const MAX_WROLD_RANK_NUM_PAGE = 10;

/**
 * 联盟配置信息
 */
const AllyConfig = {
    GetAllyByLevel: ($_lv) => {
        AllyConfig.InitData();
        if(!!AllyConfig.$configList[$_lv]){
            return AllyConfig.$configList[$_lv];
        }
        return {'lv': 1, 'member': 15};
    },
    GetAllyByExp: ($exp) => {
        AllyConfig.InitData();
        let $ret = {'lv': 1, 'member': 15};
        for(let $key in AllyConfig.$configList){
            let $value = AllyConfig.$configList[$key];
            if($exp < $value['exp']){
                break;
            }
            $ret = $value;
        }
        return $ret;
    },
    /**
     * 入盟冷却时间
     */
    $joinAllyCD: 3600,
    $configList: null,
    InitData: () => {
        if(AllyConfig.$configList == null){
            AllyConfig.$configList = {
                1: {'lv': 1, 'exp': 1000, 'member': 15},
                2: {'lv': 2, 'exp': 5000, 'member': 20},
                3: {'lv': 3, 'exp': 10000, 'member': 25},
                4: {'lv': 4, 'exp': 20000, 'member': 30},
                5: {'lv': 5, 'exp': 20000000, 'member': 50},
            };
        }
    }
}

class AllyRank
{
    constructor(){
        this.aid = 0;
        this.Name = '';
        this.slogan = '';
        this.level = 0;
        this.member = 0;
        this.maxMember = 0;
        this.battle = 0;
        this.Relation = 0; // 0 Ro_Normal
    }
}

/**
 * 联盟成员类
 */
class AllyMember
{
    constructor() {
        this.uid = 0;                       //用户ID
        this.AllyHonor = 0;                 //联盟军功
        this.HeadShip = 0;                  //0盟主 1长老 2护法 3普通成员
        this.AttackCD = facade.util.now();   //上一次攻击后产生的CD时间戳
        this.Battle = 0;                    //玩家等级
    }

    /**
     * 审核权限
     * @param $_exec
     * @return bool
     */
    CanExecute($_exec) {
        if(this.HeadShip == 0){
            return true;
        }

        switch($_exec) {
            case AllyPower.ap_Kick:
            case AllyPower.ap_Join:
                return this.HeadShip <= 1;
        }
        return false;
    }
}

/**
 * 联盟类
 */
class BaseAllyObject extends BaseEntity
{
    /**
     * 构造函数
     * @param {ally} orm 
     */
	constructor(orm, router){
        super(orm, router);

        //region 成员属性
        this.MemberList = {};//盟友列表 array of AllyMember
        this.MemberSortList = [];//盟友排序列表 array of &AllyMember
        this.MemberReqList = {};//入盟申请列表，按照提交顺序排列,最多10个，不提供分页算法 array of &BaseUserInfo
        this.level = 0;
        this.MaxMember = 0;//联盟最大人数
        //endregion
    }

    //region 联盟申请相关
    //* 关于申请和邀请
    //* 1、用户申请入盟，入盟请求加入AllyObject.Users，同时加入该用户IUser.Invite中，用户事后可以取消加盟请求，此时也要从上述两处地方删除记录
    //* 2、盟主根据AllyObject.Users中的申请信息，批准用户加盟，批准信息通过交互消息发送给用户，用户登录时删除邀请、将自身加入联盟
    //* 3、盟主邀请用户加入时，加盟邀请通过交互消息发送给用户，在该用户登录时写入自身IUser.Invite中。用户同意后直接将自身加入联盟
    //* 4、如果是主动加盟，则立即清除IUser.Invite中所有消息，如果是被动加盟则通过发送交互消息，待用户登录后再清除IUser.Invite

    /**
     * 获取第三方对本联盟的申请列表
     * @return array
     */
    ReqGetList() {
        let $ret = {};
        for(let $key in this.MemberReqList){
            let $value = this.MemberReqList[$key];
            $ret[$value.uid] = $value;
        }
        return $ret;
    }

    Save(){
        if(this.dirty){
            this.dirty = false;
            this.orm.save().then(e=>{});
        }
    }

    /**
     * 提交入盟申请
     * @param IUser $bi
     * @return int
     */
    ReqSubmit($bi){
        if(!$bi){
            return ReturnCode.UserNotExist;
        };

        if(this.isFull() || Object.keys(this.MemberReqList).length >= 10){
            return ReturnCode.MemberFull;
        };

        //成功添加申请
        $bi.getInviteMgr().Set(InviteType.AllyReq, this.aid);//将邀请写入用户自身Invite字段

        //写入联盟的入盟申请列表
        let $am = new AllyMember();
        $am.uid = $bi['id'];
        this.MemberReqList[$am.uid] = $am;
        this['Users'] = this.GetUserStr();

        //设置脏数据标志
        this.dirty = true;

        return ReturnCode.Success;
    }

    get aid(){
        return this.orm.id;
    }

    /**
     * 批准入盟申请
     */
    ReqAllow($oper, $uid) {
        if(this.aid <= 0){
            return ReturnCode.AllyNotExist;
        }

        if(this.isFull()){
            return ReturnCode.MemberFull;
        }

        if(!!this.MemberList[$uid]){
            return ReturnCode.Success;//已经是成员了
        }

        if(($oper['id'] == $uid) && ($oper['id'] == this['uid'])){//创建联盟时执行的特殊操作
        }
        else{
            //是否存在之前提交的申请
            if(!this.MemberReqList[$uid]){
                return ReturnCode.MemberReqNotExist;
            }

            //提交者是否拥有合适的权限
            if(!this.MemberList[$oper['id']] || !this.MemberList[$oper['id']].CanExecute(AllyPower.ap_Join)){
                return ReturnCode.PowerLimit;
            }
        }

        //删除邀请记录
        delete this.MemberReqList[$uid];
        //更新成员字符串，因为删除了邀请记录需要保存
        this['Users'] = this.GetUserStr();
        //设置脏数据标志
        this.dirty = true;

        facade.current.notifyEvent('ally.reqAllow', {aid:this.aid, src:$oper['id'], dst:$uid});
        
        //返回成功码
        return ReturnCode.Success;
    }

    /**
     * 收到同意加盟的交互消息，将自己加入联盟中，同时清除申请信息
     * @param int $operId
     * @param IUser $user
     */
    ReqAllowAccepted($operId, $user) {
        //删除请求记录
        $user.getInviteMgr().Clear(InviteType.AllyReq, this.aid);

        if($user.aid > 0){//已经添加了联盟，不能再添加了
            return ReturnCode.HasAlly;
        }

        if(this.isFull()){//联盟已满
            return ReturnCode.MemberFull;
        }

        //设置联盟ID
        $user.aid = this.aid;

        //添加为成员
        let $am = new AllyMember();
        $am.uid = $user['id'];
        if($am.uid == this.uid){
            $am.HeadShip = 0;//添加的是盟主
        }
        else{
            $am.HeadShip = 3;//新加入的普通会员
        }
        $am.Battle = $user['rank'];//设置成员战力 2015.12.8 liub
        this.MemberList[$user['id']] = $am;
        this.MemberSortList.push(this.MemberList[$user['id']]);

        if(this.MemberSortList.length > 1){//如果是盟主初创联盟时，不产生入盟事件
            //添加联盟新闻
            this.AddNewsWithType(AllyNewsType.MemberEnter, $operId + ',' + $user['id']);//构造事件参数列表
        }

        //重新计算平均战斗力
        this.SetAllyBattle();

        //更新成员字符串
        this['Users'] = this.GetUserStr();
        //设置脏数据标志
        this.dirty = true;

        return ReturnCode.Success;
    }

    /**
     * 盟主拒绝请求
     * @param int $simId
     * @return int
     */
    ReqDeny($simId){
        //删除之前的入盟邀请
        delete this.MemberReqList[$simId];

        this['Users'] = this.GetUserStr();

        //设置待更新标志
        this.dirty = true;
        
        return ReturnCode.Success;
    }

    /**
     * 发起者取消请求
     * @param IUser $user
     */
    ReqCancel($user){
        $user.getInviteMgr().Clear(InviteType.AllyReq, this.data['aid']); //删除邀请

        //删除之前的入盟邀请
        unset(this.MemberReqList[$user['id']]);
        this['Users'] = this.GetUserStr();

        //设置待更新标志
        this.dirty = true;
        
        return ReturnCode.Success;
    }

    //endregion

    /**
     * 获取联盟列表总页数
     * @return int
     */
    GetPagesOfMember(){
        return Math.ceil(this.MemberSortList.length * 1.0 / MAX_WROLD_RANK_NUM_PAGE);
    }

    /**
     * 盟友捐献的能源，盟主利用此能源升级王国
     * @return mixed
     */
    GetEnergy(){
        return this['Energy'];
    }
    SetEnergy($value){
        this['Energy'] = $value;
    }

    /**
     * 盟主设定的、加入所需要的战力等级
     */
    get BattleGrade(){
        return this.orm['BattleGrade'];
    }
    set BattleGrade($value){
        this.orm['BattleGrade'] = $value;
    }

    get Users(){
        return this.orm['Users'];
    }
    set Users($value){
        this.orm['Users'] = $value;
    }

    /**
     * 生成用户列表序列化串
     * @return string
     */
    GetUserStr() {
        let $ret = '';
        for(let $key in this.MemberList){
            let $value = this.MemberList[$key];
            if($ret != ''){
                $ret += '|';
            }
            $ret += `${$value.uid},${$value.AllyHonor},1`;
        }
        for(let $key in this.MemberReqList){
            let $value = this.MemberReqList[$key];
            if($ret != ''){
                $ret += '|';
            }
            $ret += "{$value->uid},0,0";
        }
        return $ret;
    }

    //获取入盟最低战力值
    GetAllyBattle(){
        return this.BattleGrade * 0.7;
    }

    //重新计算联盟战力
    SetAllyBattle(){
        this.dirty = true;

        this.BattleGrade = 0;
        if(Object.keys(this.MemberList).length > 0){
            for(let $key in this.MemberList){
                let $value = this.MemberList[$key];
                this.BattleGrade += $value.Battle;
            }
            this.BattleGrade = (this.BattleGrade / Object.keys(this.MemberList).length) | 0;
        }

        return this.BattleGrade;
    }

    /**
     * 联盟等级，初始1级，联盟成员数量上限 = 15 + 联盟等级×5
     * @return int
     */
    Getlevel() {
        return this.level;
    }

    /**
     * 设置联盟等级，同时设置相关数据
     */
    Setlevel($_lv){
        let $curLv = AllyConfig.GetAllyByLevel($_lv);
        if($curLv){
            this.level = $curLv['lv'];
            this.MaxMember = $curLv['member'];
        }
    }

    /**
     * 对外口号， string[MAX_SLOGAN]
     * @return mixed
     */
    get sloganOuter(){
        return this.orm['sloganOuter'];
    }
    set sloganOuter($value){
        this.orm['sloganOuter'] = $value;
    }

    /**
     * 对内口号
     * @return mixed
     */
    get sloganInner(){
        return this.orm['sloganInner'];
    }
    set sloganInner($value){
        this.orm['sloganInner'] = $value;
    }
    /**
     * 联盟名称
     */
    get Name(){
        return this.orm['Name'];
    }
    set Name($value){
        this.orm['Name'] = $value;
        this.dirty = true;
    }

    /**
     * 联盟经验，盟友获得军功的同时，贡献联盟经验
     * @return int
     */
    get experience() {
        return this.orm['experience'];
    }
    /**
     * @param int $experience
     */
    set experience($experience)
    {
        this.orm['experience'] = $experience;
    }

    /**
     * 盟主ID
     * @return mixed
     */
	get uid() {
	    return this.orm['uid'];
	}
	set uid($value){
        this.orm['uid'] = $value;
        return this.orm['uid'];
    }

    /**
     * 设置联盟个性化设定
     * @param $_set
     */
	Set($_set){
        this['aSetting'] = this['aSetting'] | $_set;
        this.dirty = true;
    }

	//复位某个变更标志位 AllySetting
	Unset($_set){
        this['aSetting'] = this['aSetting'] & ~$_set;
    }

    /*
     * 检查指定标志位（可联合）
     * @_set: AllySetting
     */
	Check($_set) {
        return ((this['aSetting'] & $_set) == $_set);
    }

    GetLeader() {
        return facade.GetObject(EntityType.User, this.orm['uid']); //获取缓存对象
    }

	CheckBattle($_battle){
        return $_battle >= this.GetAllyBattle();
	}

	//获取联盟当前成员的军功之和，最小不小于传入的军功值
	GetAllyHonorTotal($_honor) {
        let $ret = 0;
		if(Object.keys(this.MemberList).length > 0){
		    for(let $key in this.MemberList){
                let $value = this.MemberList[$key];
                $ret += $value.AllyHonor;
            }
		}
		return Math.max($_honor, $ret);
	}

    /**
     * 删除联盟对象
     */
    Terminate(){
        //向所有人群发联盟解散消息
        for(let $value of this.GetAllMember()){
            facade.current.notifyEvent('ally.terminated', {aid:this.aid, dst:$value.uid});
        }
    }

    //捐献
	Donate($_uid, $_energy) {
        //给联盟加能源
        this.Energy += Math.min(1000000000, $_energy);

        //将能源转化成军功
        $_rate = 100;
        $_exp = $_energy * 1.0 / $_rate;

        //添加联盟军功
        this.AddAllyHonor($_uid, $_exp);

        //添加联盟新闻:×盟友捐献×能源
        this.AddNewsWithType(AllyNewsType.Donate, "$_uid,$_energy");
    }

    onUpdate(){
        facade.current.notifyEvent('ally.update', {id:this.aid});
    }

	refreshBonusTime($_kid, $obtain){
	    for(let $key in this.MemberList){
            let $value = this.MemberList[$key];
            if($obtain){
                    $value.BonusTimeStamp[$_kid] = facade.util.now();
            }
            else{
                delete $value.BonusTimeStamp[$_kid];
            }
        }
    }

	//修改联盟设定 成功返回修改后的设定
	ChangeSetting($_uid, $_set){
        let $am = this.GetMember($_uid);
		if(!$am || !$am.CanExecute(AllyPower.ap_Setting)){
            return ReturnCode.PowerLimit;
        }
		this['aSetting'] = $_set;

		if(this.Check(AllySetting.AS_Auto)){
		    //如果改为自动收人的话，之前的单子全部自动处理
            for(let $key in this.MemberReqList){
                let $value = this.MemberReqList[$key];
                this.ReqAllow(this.GetLeader(), $value.uid);
            }
		}
        //设置待更新标志
        this.dirty = true;
        
		return this['aSetting'];
	}

	isFull() {
		return Object.keys(this.MemberList).length >= this.MaxMember;
	}

	/**
     * 插入新闻
     * @param {*}  $_type 类型
     * @param {*}  $_temp 内容
     */
	AddNewsWithType($_type, $_temp) {
        facade.current.notifyEvent('ally.addNews', {aid:this.aid, type:$_type, value:$_temp});
	}

    /**
     * 禅让盟主
     * @param $_oper
     * @param $_uid
     * @return int
     */
	ChangeLeader($_oper, $_uid){
        if(this.aid <= 0){
            return ReturnCode.AllyNotExist;
        }

    	if($_oper != this.uid){
            return ReturnCode.PowerLimit;
        }

	    if(!this.MemberList[$_uid] || !(this.MemberList[$_oper])){
            return ReturnCode.UserNotExist;
        }

        //修改联盟盟主信息
        this.Setuid($_uid);
        this.MemberList[$_uid].HeadShip = 0;
        this.MemberList[$_oper].HeadShip = 3;

	    this.RefreshHeadShip();

        //添加禅让新闻
        this.AddNewsWithType(AllyNewsType.LeaderChange, "$_oper,$_uid");

        return ReturnCode.Success;
    }

	/**
     * 根据用户ID，返回对应的联盟成员对象 
     * @param {AllyMember}  
     */
	GetMember($_uid) {
	    if(!!this.MemberList[$_uid]){
	        return this.MemberList[$_uid];
        }
        else{
            return null;
        }
	}

	//返回全部用户集合
	GetAllMember(){
        return this.MemberSortList;
	}

	//获取指定用户在联盟的排名
	GetUserRank($_uid) {
        $idx = 1;
        for(let $value of this.MemberSortList){
            if($value.uid == $_uid){
                break;
            }
            $idx++;
        }
		return $idx;
    }
    
    /**
     * 重新排定盟友职务，不检测盟主合法性，适合日常检查
     */
	RefreshHeadShip(){
        //重新排定盟友职务
        let $reqNewLeader = false;
        let $user = facade.GetObject(EntityType.User, this.uid);
        if (!$user) {
            this.DelMember(null, this.uid);
            $reqNewLeader = true;//盟主数据非法，换掉
        } else {
            if (!this.MemberList[this.uid]) {
                if (this.MemberSortList.length == 1) {//只有一个人，直接指定
                    $fm = reset(this.MemberSortList);
                    this.Setuid($fm.uid);
                } else {
                    $reqNewLeader = true;//盟主不是盟员，换掉
                }
            }

            let $diff = facade.util.now() - parseInt($user['refreshTime']);
            if ($diff > 3600 * 24 * 7) {
                $reqNewLeader = true;//盟主七天未上线，换掉
            }
        }

        if (Object.keys(this.MemberList).length == 0) {//没人的盟
            return;
        }

        if (Object.keys(this.MemberList).length == 1) {//只有一个人，不要换了
            $reqNewLeader = false;
        }

        this.RefreshHeadShipWithParam($reqNewLeader);
    }

    /**
     * 重新排定盟友职务，视需要检测盟主合法性。特例：从数据库载入时强制跳过盟主合法性检测，避免载入数据时产生数据库写操作
     * @param $reqNewLeader
     */
	RefreshHeadShipWithParam($reqNewLeader){
        this.MemberSortList.sort(); //SortAllyMemberRank //修改了军功，此处重新排下序
        let $idx = 1;
        for(let $value of this.MemberSortList){
            if($idx <= 2){
                if($reqNewLeader){
                    if($value.uid != this.uid){
                        //添加禅让新闻
                        this.AddNewsWithType(AllyNewsType.LeaderChange, this.uid + ',' + $value.uid);
                        this.uid = $value.uid;//任命新的盟主
                        //设置待存储标志
                        this.dirty = true;
                        
                        $value.HeadShip = 0;
                        $reqNewLeader = false;
                    }
                    else{
                        $value.HeadShip = 1;
                    }
                }
                else{
                    if($value.uid != this.uid){
                        $value.HeadShip = 1;
                    }
                    else{
                        $value.HeadShip = 0;
                    }
                }
            }
            else if($idx <= 6){
                if($value.uid != this.uid){
                    $value.HeadShip = 2;
                }
                else{
                    $value.HeadShip = 0;
                }
            }
            else{
                if($value.uid != this.uid){
                    $value.HeadShip = 3;
                }
                else{
                    $value.HeadShip = 0;
                }
            }
            $idx++;
        }
        this.MemberSortList.sort(); //SortAllyMemberRank //再次排序，考虑了职务高低
    }

    /**
     * 获取联盟排名信息
     * @param int $_user
     * @return AllyRank
     */
    GetAllyRankInfo($user) {
        let $rm = new AllyRank();
    	$rm.aid = this.aid;
        $rm.Name = this.Name;
        //不在列表信息请求中发送slogan，增加发送联盟等级，这样可以将包的尺寸缩小到550字节以内,而之前超过2K
        //$rm->slogan = this.sloganOuter;
        $rm.level = this.level;
        $rm.member = Object.keys(this.MemberList).length;
        $rm.maxMember = this.MaxMember;
        if(this.Check(AllySetting.AS_Battle)){
            $rm.battle = this.GetAllyBattle();
        }
        $rm.Relation = 0; //0 Ro_Normal
        if($user['aid'] <= 0){
            //Relation: 4申请中 5邀请你
            if($user.getInviteMgr().hasInvite(InviteType.AllyInvite, this.aid)){
                $rm.Relation = AllyRelationEnum.Ro_BeReqMember;
            }
            else if($user.getInviteMgr().hasInvite(InviteType.AllyReq, this.aid)){
                $rm.Relation = AllyRelationEnum.Ro_ReqMember;
            }
        }
        return $rm;
    }

    /**
     * 取指定页面成员列表，_page基于0
     * @param int $_page
     * @param int $_uid
     * @param array(AllyMember) $list
     * @return int
     */
    GetPageOfMemberWithUid($_page, $_uid, $list) {
        if($_page == -1){
            //取我所在的页面
            $sid = this.GetUserRank($_uid);
		    $_page = Math.ceil($sid / MAX_WROLD_RANK_NUM_PAGE) - 1;
    	}
        $_page = Math.max(0, Math.min($_page, Math.ceil(this.MemberSortList.length / MAX_WROLD_RANK_NUM_PAGE) - 1));

        let $idx = -1;
        for(let $value of this.MemberSortList){
            $idx++;
            if($idx < $_page*10){continue;};
            if($idx > ($_page+1)*10){break;};

            $list[$idx+1] = $value;
        }
        return $_page;
    }

    /**
     * 为联盟增加经验，由盟友获取军功时附加获得
     * @param int $_uid
     * @param int $_exp
     */
    AddAllyHonor($_uid, $_exp) {
        if($_exp <= 0 || $_exp > 5000){
            return;//数据非法
        }

        if(!this.MemberList[$_uid]){
            return;
        }
        let $itor = this.MemberList[$_uid];

        //给个人加军功
        $itor.AllyHonor = Math.min(100000000, $itor.AllyHonor + $_exp);
        //给联盟加经验
        this.experience = Math.min(200000000, this.experience + $_exp);
        //保存联盟数据
        this.dirty = true;
        
        //根据配置表计算联盟等级
        let $_oldLevel = this.level;//保存旧有等级数据
        $curLv = AllyConfig.GetAllyByExp(this.experience); //AllyBaseInfoConfig
        if($curLv){
            this.Setlevel($curLv['lv']);
        }

        if(this.level > $_oldLevel){
            //添加联盟新闻
            this.AddNewsWithType(AllyNewsType.AllyUpgrade, this.level);
        }

        //重新排定盟友职务
        this.RefreshHeadShip();
    }

    /**
     * 删除成员
     * @param IUser $oper
     * @param int $uid
     * @return int
     */
    DelMember($oper, $uid) {
        if(this.aid <= 0){
            return ReturnCode.AllyNotExist;
        }

        if(!this.MemberList[$uid]){
            //不是成员，看看有没有入盟申请
            if(!this.MemberReqList[$uid]) {
                return ReturnCode.DataNotExist;
            }

            //删除之前的入盟邀请
            delete this.MemberReqList[$uid];
            //设置待更新标志
            this.dirty = true;

            return ReturnCode.Success;
        }
        else{
            if($uid == this.uid){//盟主不能退盟
                return ReturnCode.PowerLimit;
            };

            if($oper != null && $oper['id'] != $uid){//为null表示系统删除，不需要验证权限；操作员和盟员ID一致，表示自己退出，也不需要验证
                if(!this.MemberList[$oper['id']] || !this.MemberList[$oper['id']].CanExecute(AllyPower.ap_Kick)){
                    return ReturnCode.PowerLimit;
                };
            };

            for(let $value of this.MemberSortList) {
                if($value.uid == $uid){
                    delete this.MemberSortList[$key]; //从成员排序列表中删除
                    break;//php即使修改了循环相关变量，也能继续循环而不报错
                }
            }
            //从成员列表中删除
            delete this.MemberList[$uid];

            if(!!$oper){
                if($oper.id == $uid){//自己退盟，立即修改联盟ID
                    $oper.aid =  0;
                }
                else{
                    facade.current.notifyEvent('ally.kicked', {aid:this.aid, src:$oper['id'], dst:$uid});
                }

                if($oper['id'] == $uid){//添加盟员退盟新闻
                    this.AddNewsWithType(AllyNewsType.MemberLeave, $uid);
                }
                else{//添加踢出盟员新闻
                    this.AddNewsWithType(AllyNewsType.MemberKick, `${$oper['id']}, ${$uid}`);
                }
            }

            //重新计算平均战斗力
            this.SetAllyBattle();
            this['Users'] = this.GetUserStr();
            //设置待更新标志
            this.dirty = true;
            
            return ReturnCode.Success;
        }
    }

    /**
     * 根据数据库序列化串，反向生成盟友列表
     * @param string $events
     */
    AnaUserStr($events) {
        this.MemberSortList = [];
        this.MemberList = {};

        if ($events != null && $events != '') {
            let $_events = $events.split('|');
            for(let $itor of $_events){
                let $_tempEvent = $itor.split(',');
                if ($_tempEvent.length >=3) {
                    let $st = parseInt($_tempEvent[2]);
                    if($st == 1){ //正式会员
                        let $am = new AllyMember();
                        $am.uid = parseInt($_tempEvent[0]);
                        $am.AllyHonor = parseInt($_tempEvent[1]);
                        $am.HeadShip = 3;//默认都是普通成员

                        this.MemberList[$am.uid] = $am;
                        this.MemberSortList.push(this.MemberList[$am.uid]);
                    }
                    else if($st == 0){//申请中
                        let $am = new AllyMember();
                        $am.uid = parseInt($_tempEvent[0]);
                        $am.AllyHonor = parseInt($_tempEvent[1]);
                        $am.HeadShip = 3;//默认都是普通成员

                        this.MemberReqList[$am.uid] = $am;
                    }
                }
            }
            //刷新下盟友的职务.
            this.RefreshHeadShip();
            this.SetAllyBattle(); //实时计算下战力
            //End.
        }
    }

    //#region 加盟邀请管理函数

    /**
     * 邀请玩家加入
     * @param IUser $src
     * @param IUser $dst
     * @return int
     */
    static InviteSubmit($src, $dstId) {
        if($src['aid'] <= 0){
            return ReturnCode.AllyNotExist;
        }
        let $ao = facade.GetObject(EntityType.Ally, $src['aid']);
        if(!$ao){
            return ReturnCode.AllyNotExist;
        }

        let $am = $ao.GetMember($src['id']);
        if(!$am || !$am.CanExecute(AllyPower.ap_Join)){
            return ReturnCode.PowerLimit;
        }

        //发出交互类异步事件
        facade.current.notifyEvent('ally.invite', {aid:$ao['aid'], src:$src.id, dst:$dstId});
        return ReturnCode.Success;
    }

    /**
     * 拒绝入盟邀请
     * @param IUser $user
     * @param int $_aid
     */
    static InviteCancel($user, $_aid){
        $user.getInviteMgr().Clear(InviteType.AllyInvite, $_aid);
    }

    //接受某联盟的加盟邀请
    static InviteAccept($uo, $_aid) {
        $ret = ReturnCode.Success;
        if(false == $uo.getInviteMgr().hasInvite(InviteType.AllyInvite, $_aid)){
            $ret = ReturnCode.DataNotExist;
        }
        else{
            let $ao = facade.GetObject(EntityType.Ally, $_aid);
            //入盟邀请处理流程：先模拟入盟申请、再自动批准，在后续流程中读取批准消息并处理
            $ret = $ao.ReqSubmit($uo);
            if($ret == ReturnCode.Success){
                $ret = $ao.ReqAllow($ao.GetLeader(), $uo['id']);
            }
            if(!$ao){
                $ret = ReturnCode.AllyNotExist;
            }
        }
        //删除之前的入盟邀请
        $uo.getInviteMgr().Clear(InviteType.AllyInvite, $_aid);

        return $ret;
    }

    //#endregion

    //#region 联盟管理 - 成立及解散

    /**
     * 解散联盟 0成功 Supper == true表示强制解散
     * @param IUser $user
     * @param bool $Supper
     * @return int
     */
    static AllyTerminate($user, $Supper = false) {
        let $ret = ReturnCode.Success;

        if($user['aid'] == 0){
            return ReturnCode.HasNoAlly;
        }

        let $ao = facade.GetObject(EntityType.Ally, $user['aid']);
        if(!$ao){
            return ReturnCode.AllyNotExist;
        };

        if(!$Supper){
            let $am = $ao.GetMember($user['id']);
            if(!$am || !$am.CanExecute(AllyPower.ap_Terminate)){
                $ret = ReturnCode.PowerLimit;
            };
        }

        if($ret == ReturnCode.Success){
            $ao.Terminate();
            
            //删除联盟新闻
            facade.current.notifyEvent('ally.clearNews', {aid:$ao['aid']});
    
            //从缓存和数据库中删除联盟数据
            $ao.Remove();
        };

        return $ret;
    }

    /**
     * 创建联盟, 返回结果码
     * @param {UserEntity} $uo
     * @return int
     */
    static async AllyCreate($uo) {
        if($uo['aid'] > 0){
            return ReturnCode.HasAlly;
        }
        let $ao = await facade.GetMapping(EntityType.Ally).Create($uo.id, $uo.openid);
        $ao.ReqSubmit($uo);
        $ao.ReqAllow($uo, $uo['id']);

        if(!$ao){
            return ReturnCode.paramError;
        }
        else{
            //添加联盟新闻
            $ao.AddNewsWithType(AllyNewsType.AllyCreate, $uo['id']);
        }
        return ReturnCode.Success;
    }

    //#endregion

    //#region 联盟管理 - 信息修改

    /**
     * 修改联盟名称
     * @param int $_uid
     * @param $name
     * @param int $oper
     * @return int
     */
    ChangeName($_uid, $name, $oper) {
        let $am = this.GetMember($_uid);
        if(!$am || !$am.CanExecute(AllyPower.ap_Setting)){
            return ReturnCode.PowerLimit;
        }
        switch($oper){
            case 0:
            {
                this.Name = $name;
            }
                break;

            case 1://对外
            {
                this.sloganOuter = $name;
            }
                break;

            case 2://对内
            {
                this.sloganInner = $name;
            }
                break;
        }

        this.dirty = true;
        return ReturnCode.Success;
    }
    //#endregion

    //#region 集合功能

    /**
     * 索引值
     */
    IndexOf(type){
        switch(type){
            case IndexType.Foreign:
                return this.orm.uid;
            default:
                return this.orm.id;
        }
    }

    /**
     * 使用Mapping映射类时的配置参数
     */
    static get mapParams(){
        return {
            model: ally,            //对应数据库单表的ORM封装
            entity: this,           //实体对象，在model之上做了多种业务封装
            etype: EntityType.Ally, //实体类型
        };
    }

    /**
     * 创建时的回调函数
     */
    static async onCreate(uid, name) {
        let self = this;
        try{
            let it = await ally().findCreateFind({
                where:{
                    uid:uid,
                },
                defaults: self.getDefaultValue(uid, name),
            });
            return it[0];
        }
        catch(e){
            console.error(e);
            return null;
        }
    }

    /**
     * 进行字典映射时的回调函数
     * @param {ally} record
     */
    static onMapping(record){
        let ao = new this(record, facade.current);
        if(record.$options.isNewRecord){//新创建的记录
            ao.isNewbie = true;
            ao.aSetting = 0;
            ao.experience = 0;
            ao.Energy = 0;
            ao.BattleGrade = 0;
            ao.Name = '';
            ao.sloganOuter = '';
            ao.sloganInner = '';
            ao.Users = '';
            ao.experience = 0;
        }
        else{//已有的记录
            ao.isNewbie = false;
        }

        let $curLv = AllyConfig.GetAllyByExp(ao.experience);
        if(!!$curLv){
            ao.Setlevel($curLv['lv']);
        };
        ao.AnaUserStr(record.Users);//载入盟友列表

        return ao;
    }

    /**
     * 载入用户信息时的回调函数
     * @param {*} db 
     * @param {*} sa 
     * @param {*} pwd 
     * @param {*} callback 
     */
    static async onLoad(db, sa, pwd, callback){
        db = db || facade.current.options.mysql.db;
        sa = sa || facade.current.options.mysql.sa;
        pwd = pwd || facade.current.options.mysql.pwd;

        try{
            let ret = await ally(db, sa, pwd).findAll();
            ret.map(it=>{
                callback(it);
            });
        }catch(e){}
    }

    /**
     * 填充新用户默认注册信息
     * @param {*} userName 
     * @param {*} domain 
     * @param {*} openid 
     */
    static getDefaultValue(uid, name){
        return {
            uid:uid,
            name:name,
        };
    }
    //#endregion
}

exports = module.exports = BaseAllyObject;
