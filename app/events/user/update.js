let facade = require('../../../facade/Facade')
let UserEntity = facade.UserEntity
let autoSave = require('../../../facade/util/autoExec/autoSave');

/**
 * Created by admin on 2017-05-26.
 */
function handle(event) {
    //刷新榜单
    facade.GetRanking(UserEntity).Update(event.user, false); //必须确保此函数内部没有对user做出修改，否则会造成死循环
    facade.current.autoTaskMgr.addTask(new autoSave(event.user.id));
}

module.exports.handle = handle;
