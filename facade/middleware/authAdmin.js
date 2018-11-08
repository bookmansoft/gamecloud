let facade = require('../../facade/Facade')
let {MiddlewareParam, ReturnCode} = facade.const

/**
 * 管理员认证鉴权流程
 * @param {MiddlewareParam} sofar
 */
async function handle(sofar) {
    let ret = { ret: 0 };
    try {
        if (!sofar.socket.user || sofar.msg.type == "login"/*如果是login则强制重新验证*/) {
            let signal = sofar.msg.oemInfo.auth.sign == facade.util.sign(sofar.msg.oemInfo.auth, sofar.facade.options.game_secret);
            let timer = Math.abs(sofar.msg.oemInfo.auth.t - facade.util.now()) <= 300;
            if (!signal || !timer) {
                console.log(signal, timer);
                sofar.fn({ code: ReturnCode.authThirdPartFailed });
                sofar.recy = false;
                return;
            }

            //此处要对domainId、openid重新赋值
            sofar.msg.oemInfo.openid = sofar.msg.oemInfo.auth.plat_user_id;
            sofar.msg.domainId = sofar.msg.oemInfo.domain + '.' + sofar.msg.oemInfo.openid;//用户唯一标识
            sofar.msg.oemInfo.token = facade.util.sign({ did: sofar.msg.domainId }, sofar.facade.options.game_secret); //为用户生成令牌

            let usr = {
                domain: sofar.msg.oemInfo.domain, 
                openid: sofar.msg.oemInfo.openid, 
                sign: sofar.msg.oemInfo.token,      //令牌
                time: facade.util.now(),             //记录标识令牌有效期的时间戳
                socket: sofar.socket,               //更新通讯句柄
            };
            sofar.socket.user = usr;
        }

        if (!sofar.socket.user) {//未通过身份校验
            sofar.fn({ code: ReturnCode.userIllegal });
            sofar.recy = false;
        }
    }
    catch (e) {
        console.error(e);
        sofar.fn({ code: ReturnCode.illegalData, data: ret });
        sofar.recy = false;
    }
}

module.exports.handle = handle;
