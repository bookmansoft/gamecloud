let facade = require('../../../facade/Facade')
let {EntityType, InviteType, NotifyType, ResType,ActivityType,em_Condition_Type,em_Condition_Checkmode} = facade.const

/**
 * 加盟邀请
 */
function handle(event){
    let user = facade.GetObject(EntityType.User, event.dst);
    if(!!user && user.aid == 0){
        user.getInviteMgr().Set(InviteType.AllyInvite, event.aid); //添加加盟邀请
    }
}

module.exports.handle = handle;
