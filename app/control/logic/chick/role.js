let facade = require('../../../../facade/Facade')

/**
 * 道具功能相关的控制器
 * Created by liub on 2017-04-08.
 */
class item extends facade.Control
{
    upgrade(pUser, info){
        let ret = pUser.baseMgr.item.upgradeRole(info.id);
        if(ret.lv == 1) {//如果为新角色解锁，发送系统消息
            this.parent.control.chat.sendChat(pUser,{id:10,name:pUser.name,roldId:ret.id,c:"1",system:1});
        }
        return ret;
    }
    skill(pUser, info){
        return pUser.baseMgr.item.upgradeSkill(info.id,info.skid,info.price);
    }
    list(pUser){
        return {code: facade.const.ReturnCode.Success, data:pUser.baseMgr.item.getRoleList()};
    }
    /**
     * 角色分享
     * @param {UserEntity} pUser
     */
    share(pUser,info){
        //id 角色id choose 是否选择分享
        if(!pUser.getPocket().GetRes(facade.const.ResType.PetHead, info.id)){
            return {code:ReturnCode.illegalData};
        }
        if(info.choose != 0){
            let bonus = [{type: facade.const.ResType.Diamond, num:50}];
            pUser.getBonus(bonus);
            pUser.notify({type: facade.const.NotifyType.roleShare, info: {bonus:bonus}});
        }
        return {code:ReturnCode.Success};
    }
    unlockedScene(pUser,info){
        return pUser.baseMgr.item.unlockedScene(info.sceneid);
    }
}

exports = module.exports = item;
