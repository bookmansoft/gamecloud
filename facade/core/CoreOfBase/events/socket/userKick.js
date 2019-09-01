/**
 * Created by admin on 2017-05-26.
 */
let facade = require('../../../../Facade')
let {CommMode} = facade.const

/**
 * 逻辑服踢人下线
 * @param data
 */
function handle(data){
    if(!data.sid){
        return;
    }

    switch(data.sid.commMode){
        case CommMode.ws:
            if(data.sid.id in this.service.server.connected){
                this.service.server.connected[data.sid.id].disconnect();
            }
            break;

        default:
            break;
    }
}

module.exports.handle = handle;