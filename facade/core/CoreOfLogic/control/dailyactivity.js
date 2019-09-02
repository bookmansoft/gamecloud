let facade = require('../../../Facade')
let {ResType, ReturnCode} = facade.const
/**
 * 活动功能相关的控制器
 * Created by liub on 2017-07-01.
 */
class dailyactivity extends facade.Control
{
    async getInfo(user){
        return await this.core.remoteCall('dailyactivity.getInfo', [user.domain, user.openid], msg=>{return msg});
    }

    /**
     * 获取活动排名列表
     */
    async getList(user){
        return {
            code: ReturnCode.Success, 
            data: await this.core.remoteCall('dailyactivity.getList', [user.domain, user.openid], msg=>{return msg})
        };
    }

    async addProp(user,data){
        return await this.core.remoteCall('dailyactivity.addProp', [user.domain, user.openid, data.choose, data.num], msg=>{return msg})
    }

    async setScore(user,data){
        return await this.core.remoteCall('dailyactivity.setScore', [user.domain, user.openid, data.id], msg=>{return msg})
    }

    // async joinActivity(user){
    //     return await this.parent.remoteCall('dailyactivity.joinActivity', [user.domainId], msg=>{return msg})
    // }

    // choose(user,data){
    //     return this.parent.service.dailyactivity.choose(user.id,data.id);
    // }
    async countChoose(user,data){
        return await this.core.remoteCall('dailyactivity.countChoose',[], msg=>{return msg})
    }
    async countProp(user){
        return await this.core.remoteCall('dailyactivity.countProp', [], msg=>{return msg})
    }
    async checkJoin(user){
        return await this.core.remoteCall('dailyactivity.checkJoin',[user.domain, user.openid], msg=>{return msg})
    }
    async toJoin(user){
        let cost = 20;
        if(user.baseMgr.item.GetRes(ResType.Diamond) >= cost){
            let ret = await this.core.remoteCall('dailyactivity.toJoin',[user.domain, user.openid], msg=>{return msg});
            if (ret.code == ReturnCode.Success){
                user.getBonus({type:ResType.Diamond, num:-cost});
            }
            return ret;
        }
        else {
            return {code:ReturnCode.DiamondNotEnough};
        }
    }
}
exports = module.exports = dailyactivity;
