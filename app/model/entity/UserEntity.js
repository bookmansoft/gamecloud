let BaseUserEntity = require('../../../facade/model/entity/BaseUserEntity')
let {filelist} = require('../../../facade/util/configInterface')

/**
 * 用户角色类，继承自框架的UserBaseEntity
 */
class UserEntity extends BaseUserEntity
{
	constructor(user, core){
        super(user, core);

        filelist.mapPath('/app/model/assistant').map(srv=>{
            let srvObj = require(srv.path);
            this.baseMgr[srv.name.split('.')[0]] = new srvObj(this);
        });
    }
}

exports = module.exports = UserEntity
