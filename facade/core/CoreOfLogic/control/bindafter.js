let facade = require('gamecloud')
let {EntityType, IndexType, ReturnCode} = facade.const
let {now, sign} = facade.util

//为短信、邮箱验证提供签名缓存
let signMap = new Map();
//提供一个短信验证码模拟查询地址
let keyMap = new Map();

/**
 * 后期绑定功能
 * 1. 客户端将手机号码作为上行参数，调用此函数
 * 2. 客户端将手机验证码提交验证
 * 3. 系统验证通过后，将手机号码和当前用户绑定
 */
class bindafter extends facade.Control
{
    /**
     * 获取手机验证码，这是一个控制器方法，必须在登录状态下调用
     * @param {*} params 
     */
    async auth(user, params) {
        switch(params.addrType) {
            default: {
                //查询历史用户信息
                let history = this.core.GetObject(EntityType.User, params.address, IndexType.Phone);
                if(!!history) {
                    if(history.openid != user.openid) {
                        return {code: ReturnCode.userIllegal}; 
                    }
                }
                break;
            }
        }

        let ret = null;

        //检测是否存在原有签名，是否过期
        if(keyMap.get(params.address)) {
            ret = signMap.get(keyMap.get(params.address));
            if(!!ret && Math.abs(ret.t - now()) <= 60) {
                return ret; //返回现有签名，避免重复下发
            }
        }

        ret = {
            t: now(),                               //当前时间戳，游戏方必须验证时间戳，暂定有效 期为当前时间前后 5 分钟
            nonce: Math.random()*1000 | 0,          //随机数
            addrType: params.addrType || 'phone',  //地址类型，'phone'
            address: params.address,               //地址内容，如手机号码
            openid: user.openid,                    //用户登录时使用的认证信息
        };
        //生成签名字段        
        let $sign = sign(ret, this.core.options[user.domain].game_secret);
        //用签名字段生成6位数字的字符串键值
        $sign = (this.core.service.gamegoldHelper.remote.hash256(Buffer.from($sign, 'utf8')).readUInt32LE(0, true) % 1000000).toString();
        //放入缓存表
        signMap.set($sign, ret);
        keyMap.set(user.openid, $sign);

        //向用户发送短信或邮件
        this.core.notifyEvent('sys.sendsms', {params:{addrType: params.addrType, address: params.address, content: $sign}});

        return {code: ReturnCode.Success, data: ret};
    }

    /**
     * 查询短信验证码，注意只是测试阶段开放
     * @param {*} user 
     */
    async getKey(user) {
        if(!this.core.options.debug) {
            throw new Error('authThirdPartFailed');
        }

        if(keyMap.has(user.openid)) {
            return {code: ReturnCode.Success, data: keyMap.get(user.openid)};
        } else {
            return {code: ReturnCode.userIllegal};
        }
    }

    /**
     * 验签函数，调用结果直接返回客户端
     * @param {*} user 
     * @param {*} params 
     */
    async check(user, params) {
        if(!signMap.has(params.auth.captcha)) {
            return {code: ReturnCode.userIllegal};
        }

        let item = signMap.get(params.auth.captcha);

        let _sign = (item.nonce == params.auth.nonce);
        let _exp = (Math.abs(item.t - now()) <= 300);
        if (!_sign || !_exp) {
            return {code: ReturnCode.userIllegal};
        }

        let history = this.core.GetObject(EntityType.User, item.address, IndexType.Phone);
        if(!history) {
            switch(item.addrType) {
                default: {
                    this.core.notifyEvent('user.bind', {user:user, params:{addrType: item.addrType, address: item.address}});
                    break;
                }
            }
        } else {
            if(history.openid != item.openid) {
                return {code: ReturnCode.userIllegal};
            }
        }

        return {code: ReturnCode.Success};
    }
}

exports = module.exports = bindafter;
