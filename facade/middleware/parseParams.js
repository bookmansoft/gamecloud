let facade = require('../../facade/Facade')
let {MiddlewareParam} = facade.const

/**
 * 参数解析
 * @param {MiddlewareParam} sofar
 */
async function handle(sofar) {
    if (!sofar.fn) {
        sofar.fn = ret => { }; // 兼容 notify 和 jsonp 两种情形
    }
    if (!sofar.socket) {
        sofar.socket = {};  //兼容WS、Socket、Http等模式
    }

    //更新时间戳
    sofar.socket.stamp = (new Date()).valueOf(); 

    //对数据进行规整
    sofar.msg.control = sofar.msg.control || 'index';
    sofar.msg.func = sofar.msg.func || 'login';
    sofar.msg.oemInfo = sofar.msg.oemInfo || {};
    if (sofar.msg.oemInfo.constructor == String) {
        sofar.msg.oemInfo = JSON.parse(sofar.msg.oemInfo);
    }
    sofar.msg.oemInfo.domain = !!sofar.msg.oemInfo.domain ? sofar.msg.oemInfo.domain : "official";
    if (sofar.facade.options.serverType == "Test") {
        sofar.msg.oemInfo.domain = sofar.msg.oemInfo.domain.replace(/IOS/g, "Test").replace(/Android/g, "Test");
    }
    sofar.msg.token = sofar.msg.token || {};
    if(sofar.msg.token.constructor == String){
        sofar.msg.token = JSON.parse(sofar.msg.token);
    }
    sofar.msg.userinfo = sofar.msg.userinfo || {};
    if(sofar.msg.userinfo.constructor == String){
        sofar.msg.userinfo = JSON.parse(sofar.msg.userinfo);
    }
    //sofar.msg.oemInfo.openid = sofar.msg.openid;
    sofar.msg.domainId = !!sofar.msg.oemInfo.openid ? sofar.msg.oemInfo.domain + '.' + sofar.msg.oemInfo.openid : '';
}

module.exports.handle = handle;
