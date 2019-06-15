let facade = require('../../Facade')
let {DomainType, ReturnCode} = facade.const
let {now, ms, sign} = facade.util

/**
 * Created by liub on 2017-04-06.
 */

/**
 * 自定义认证接口
 */
class UserDefine extends facade.Control
{
    /**
     * 控制器自带的Url路由信息
     */
    get router() {
        return [
            ['/UserDefine', 'auth'],        //定义发放签名功能的路由、函数名
        ];
    }

    /**
     * 发放签名函数
     * @param {*} objData 
     */
    async auth(objData) {
        let ret = {
            t: now(),                               //当前时间戳，游戏方必须验证时间戳，暂定有效 期为当前时间前后 5 分钟
            nonce: Math.random()*1000 | 0,          //随机数
            plat_user_id: objData.id,               //平台用户 ID
            nickname: objData.id,                   //用户昵称
            avatar: objData.id,                     //头像
            is_tourist: 1,                          //是否为游客
        };
        ret.sign = sign(ret, this.parent.options[DomainType.D360].game_secret);
        return ret;
    }

    /**
     * 验签函数，约定函数名为 check
     * @param {*} oemInfo 
     */
    async check(oemInfo) {
        let _sign = (oemInfo.auth.sign == facade.util.sign(oemInfo.auth, this.parent.options[DomainType.D360].game_secret));
        let _exp = (Math.abs(oemInfo.auth.t - now()) <= 300);
        if (!_sign || !_exp) {
            throw new Error('authThirdPartFailed');
        }

        return oemInfo.auth.plat_user_id; //通过验证后，返回平台用户ID
    }
}

exports = module.exports = UserDefine;
