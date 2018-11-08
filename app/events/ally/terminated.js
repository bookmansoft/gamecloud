let facade = require('../../../facade/Facade')
let {EntityType, InviteType, NotifyType, ResType,ActivityType,em_Condition_Type,em_Condition_Checkmode} = facade.const
let UserEntity = facade.UserEntity

/**
 * 解散联盟
 */
function handle(event){ 
    /**
     * @type {UserEntity}
     */
    let $user = facade.GetObject(EntityType.User, event.dst);
    if(!!$user){
        //清除该盟的全部邀请
        $user.getInviteMgr().Clear(InviteType.AllyReq, event.aid);
        $user.getInviteMgr().Clear(InviteType.AllyInvite, event.aid);
        if($user.aid == event.aid){
            $user.aid = 0;//清除联盟ID
        }
    }
}

module.exports.handle = handle;
