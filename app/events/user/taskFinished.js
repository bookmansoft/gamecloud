let facade = require('../../../facade/Facade')
let {NotifyType} = facade.const
/**
 * Created by admin on 2017-05-26.
 */
function handle(data) {
    data.user.notify({type: NotifyType.taskFinished, info:{id: data.objData.id}});
}

module.exports.handle = handle;