let facade = require('../../../Facade')
let {MiddlewareParam} = facade.const

/**
 * 路由分配
 * @param {MiddlewareParam} sofar
 */
async function handle(sofar) {
    //根据路由执行相关操作
    try{
        let rs = await sofar.facade.callFunc(sofar.msg.control, sofar.msg.func, sofar.socket.user, sofar.msg);
        sofar.fn(rs);
    }catch(e){
        sofar.fn({code: facade.const.ReturnCode.Error});

        console.error(e);
    }
}

module.exports.handle = handle;
