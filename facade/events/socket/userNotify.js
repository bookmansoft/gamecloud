/**
 * Created by admin on 2017-05-26.
 */
let facade = require('../../../facade/Facade')
let {CommMode} = facade.const

/**
 * 逻辑服主动推送消息给客户端
 */
function handle(data) {
    if(!data.sid){
        return;
    }

    switch(data.sid.commMode){
        case CommMode.ws:
            if(data.sid.id in this.service.server.connected){
                this.service.server.connected[data.sid.id].emit('notify', data.msg);
            }
            break;
        
        default:
            break;
    }
}

module.exports.handle = handle;