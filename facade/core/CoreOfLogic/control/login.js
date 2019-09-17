let facade = require('../../../Facade')
let {NotifyType, ReturnCode} = facade.const

class login extends facade.Control
{
    /**
     * 用户登陆
     * @param {UserEntity} pUser		用户
     * @param {*} info		用户信息
     * @returns {{}}
     */
    async UserLogin(pUser, info) {
        this.getFriendList(pUser,info); //获取好友列表

        let ret = {code:ReturnCode.Success};

        //是否存在新邮件
        pUser.CheckMailboxState();

        ret.data = pUser.GetInfo();
        ret.data.id = pUser.id;         //本服唯一数字编号
        ret.data.openid = pUser.openid; //uuid
        ret.data.name = pUser.name;     //用户昵称，客户端直接获取，info.name不再可用
        ret.data.token = pUser.sign;    //登录令牌
        ret.data.time = pUser.time;     //标记令牌有效期的时间戳

        //推送新手引导当前步骤，为0表示无引导
        pUser.baseMgr.vip.checkGuide();
        //强制推送体力信息
        pUser.notify({type: NotifyType.action, info: pUser.getPocket().getActionData()});

        return ret;
    }

    /**
     * 获取好友信息列表，包括亲密度、点赞、在线状态、当前角色等
     *
     * @param {UserEntity} user
     * @param objData
     * @returns {Promise.<void>}
     */
    async getFriendList(user, objData){
        let result = {data:{list:[]}, code:ReturnCode.Success};
        try {
            let list = await user.getTxFriendMgr().refreshSocialNetwork();
            if(list.length > 0){
                //分包下行
                let pac = [];
                for(let idx in list){
                    pac.push(result.data.list[idx]);
                    if(pac.length >= 20){
                        user.notify({type: NotifyType.friends, info: pac});
                        pac = [];
                    }
                }
                if(pac.length > 0){
                    user.notify({type: NotifyType.friends, info: pac});
                }

                return result;
            }
            else{
                user.notify({type: NotifyType.friends, info: []});
            }
        }catch(e){
            console.error(e);
        }
    }
    
    GetDayIntIn365(time) {
        var datetime = new Date(),
            gap = 0;
        //
        if(time) {
            datetime = time instanceof Date ? time : new Date(time);
            gap = 1;
        }
        //	一天的秒数
        var day_MillSeconds = 24 * 3600 * 1000;
        var year 			= datetime.getFullYear();
        //	新年第一天
        var firstDay 		= new Date(year, 0, 1);
        //
        var dayOfYear 		= (datetime-firstDay) / day_MillSeconds +  gap;
        return Math.ceil(dayOfYear);
    }
}
exports = module.exports = login;
