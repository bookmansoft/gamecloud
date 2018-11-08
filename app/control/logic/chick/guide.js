let facade = require('../../../../facade/Facade')
/**
 * 道具功能相关的控制器
 * Created by liub on 2017-04-08.
 */
class guide extends facade.Control {
    /**
     * 查询当前引导步骤
     * @param {*} user 
     * @param {*} info 
     */
    query(user, info){
        return {code:0, data:{id:user.baseMgr.vip.GuideNo}};
    }

    /**
     * 推进新手引导步骤
     * @param {*} user 
     * @param {*} info 
     */
    finish(user, info){
        if(info.rec){//需要记录
        }
        else{//中间步骤，不需要记录

        }
        user.baseMgr.vip.GuideNo = info.gid;
    }
}

exports = module.exports = guide;
