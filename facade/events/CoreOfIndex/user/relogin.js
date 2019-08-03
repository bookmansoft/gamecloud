let facade = require('../../../../facade/Facade')
let {EventData} = require('../../../../facade/util/comm/EventData')
/**
 * Created by admin on 2017-05-26.
 * @param {EventData} event
 */
function handle(event) {
    if(event.data.type == 1 || event.data.type == 3 || event.data.type == 7){
        facade.models.login(this.options.mysql).findCreateFind({
            where:{
                uid: event.user.id,
                type: event.data.type,
            },
            defaults: {
                uid: event.user.id, 
                type: event.data.type, 
                time: event.data.time
            },
        });
    }
}

module.exports.handle = handle;
