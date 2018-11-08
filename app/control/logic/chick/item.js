let facade = require('../../../../facade/Facade')
let UserEntity = facade.UserEntity

/**
 * 道具功能相关的控制器
 * Created by liub on 2017-04-08.
 */
class item extends facade.Control 
{
    /**
     * @param {UserEntity} pUser 
     * @param {*} info 
     */
    useItem(pUser, info){
        return pUser.getPocket().AddRes(info.id, -info.num);
    }

    /**
     * @param {UserEntity} pUser 
     */
    list(pUser){
        return {code: facade.const.ReturnCode.Success, data:pUser.getPocket().getList()};
    }
}

exports = module.exports = item;
