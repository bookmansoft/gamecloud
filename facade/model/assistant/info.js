let facade = require('../../../facade/Facade')
let {RecordType, ReturnCode, ResType, UserStatus, em_Condition_Type, em_Condition_Checkmode, NotifyType, ActivityType, RankType, em_EffectCalcType,em_Effect_Comm,mapOfTechCalcType} = facade.const
let baseMgr = require('../baseAssistant');

/**
 * 用户综合信息管理
 */
class info extends baseMgr
{
	constructor(parent){
		super(parent, 'info');

        //	数据
        this.v 				= {
            name: "",
            //	邀请码
            invCode		: '',
            //	头像
            headIcon	: 0,
            //	文化值 (公司等级)
            level		: 0,
            //	体力
            ap 			: 15,
            //	金钱
            money		: facade.config.fileMap.DataConst.threshold.moneyOfInit,
            diamond		: 0,

            date: '',     //刷新日期，用于每日任务
			//用户复合状态字段
			status						: 0,
        };
    }

    LoadData(val){
        try{
            this.v = (!val||val == "" ) ? {} : JSON.parse(val);

            if(!this.v.diamond){
                this.v.diamond = 0;
            }
            if(!this.v.status){
                this.v.status = 0;
            }
        }
        catch(e){
            this.v = {
                "name": this.parent.name,
                "id": this.parent.id,
                "domain": this.parent.domain,
                "uuid": this.parent.uuid,
                "invCode": "",
                "headIcon": "",
                "level": 0,
                "ap": facade.config.fileMap.DataConst.action.init,
                "money": facade.config.fileMap.DataConst.threshold.moneyOfInit,
                "diamond":0,
                "status": 0
            };
        }

        if(!this.v.date){
            this.v.date = (new Date()).toDateString();
        }
    }

    get name(){
        return this.v.name;
    }
    set name(val){
        this.v.name = val;
        this.dirty = true;
    }

    SetStatus(val, send=true){
        let ns = facade.tools.Indicator.inst(this.v.status).set(val).value;
        if(this.v.status != ns){
            this.v.status = ns;
            this.parent.orm.status = this.v.status;
            this.dirty = true;

            if(send){
                //通知自己的客户端状态发生了变化
                this.parent.notify({type:NotifyType.status, info:this.v.status});
            }

            switch(val){
                case UserStatus.gaming:
                case UserStatus.online:
                case UserStatus.slave:
                case UserStatus.master:
                    //将新的状态登记到索引服上
                    this.parent.router.notifyEvent('user.newAttr', {user: this.parent, attr:{type:'status', value: this.v.status}});

                    //通知所有好友，状态发生了变化
                    this.parent.socialBroadcast({type: NotifyType.userStatus, info: {id:this.parent.openid, value:this.v.status}});
                    break;

                default:
                    break;
            }
        }
    }
	UnsetStatus(val, send=true){
        let ns = facade.tools.Indicator.inst(this.v.status).unSet(val).value;
        if(this.v.status != ns){
            this.v.status = ns;
            this.parent.orm.status = this.v.status;
            this.dirty = true;

            if(send){
                //通知自己的客户端状态发生了变化
                this.parent.notify({type:NotifyType.status, info:this.v.status});
            }

            switch(val){
                case UserStatus.gaming:
                case UserStatus.online:
                case UserStatus.slave:
                case UserStatus.master:
                    //通知所有好友，状态发生了变化
                    this.parent.socialBroadcast({type: NotifyType.userStatus, info: {id:this.parent.openid, value:this.v.status}});
                    //将新的状态登记到索引服上
                    this.parent.router.notifyEvent('user.newAttr', {user: this.parent, attr:{type:'status', value: this.v.status}});
                    break;

                default:
                    break;
            }
        }
    }
    CheckStatus(val){
    	return facade.tools.Indicator.inst(this.v.status).check(val);
    }
    GetStatus(){
        return this.v.status;
    }

    get role(){
        return this.GetRecord(RecordType.Role);
    }
    set role(val){
        this.SetRecord(RecordType.Role, parseInt(val));

        //角色形象发生变化
        this.parent.router.notifyEvent('user.newAttr', {user: this.parent, attr:{type:'role', value:this.GetRecord(RecordType.Role)}});
    }
    get scene(){
        return this.GetRecord(RecordType.Scene);
    }
    set scene(val){
        this.SetRecord(RecordType.Scene, parseInt(val))
    }
    get road(){
        return this.GetRecord(RecordType.Road);
    }
    set road(val){
        this.SetRecord(RecordType.Road, parseInt(val))
    }
    get address(){
        return this.GetRecord(RecordType.address);
    }
    set address(val){
        this.SetRecord(RecordType.address,val);
    }

    /**
     * 是否机器人
     * @returns {boolean}
     */
    getRobot(){
        return (this.v.robot == null) ? false : this.v.robot;
    }
    /**
     * 设置为机器人
     */
    setRobot(){
        this.v.robot = true;
        this.dirty = true;
    }

    //	设置邀请码
    SetInvCode (invCode) {
		this.v.invCode = invCode;
	};
    //	获取邀请码
    GetInvCode () {
		return this.v.invCode;
	};
    //	设置头像
    SetHeadIcon (headIcon) {
		this.v.headIcon = headIcon;
		this.dirty = true;
	};
    //	获取头像
    GetHeadIcon() {
		return this.v.headIcon;
	};
}

exports = module.exports = info;