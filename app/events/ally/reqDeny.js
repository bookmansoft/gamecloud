let facade = require('../../../facade/Facade')
let {EntityType, InviteType, NotifyType, ResType,ActivityType,em_Condition_Type,em_Condition_Checkmode} = facade.const
let UserEntity = facade.UserEntity

function handle(event){ 
    /**
     * @type {UserEntity}
     */
    let $user = facade.GetObject(EntityType.User, event.dst);
    if(!!$user){
        $user.getInviteMgr().Clear(InviteType.AllyReq, event.aid); //删除邀请
    }
}

module.exports.handle = handle;
