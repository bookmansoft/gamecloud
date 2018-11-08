let facade = require('../../../facade/Facade')
let allyAutoSave = require('../../util/autoExec/allyAutoSave');

/**
 * Created by admin on 2017-05-26.
 */
function handle(event) {
    facade.current.autoTaskMgr.addTask(new allyAutoSave(event.id));
}

module.exports.handle = handle;
