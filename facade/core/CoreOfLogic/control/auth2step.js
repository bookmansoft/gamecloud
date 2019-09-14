let facade = require('../../../Facade')
let {EntityType, IndexType, ReturnCode} = facade.const
let {now, sign} = facade.util

//为短信验证提供签名缓存, 兼具流量控制作用
let signMap = new Map();

//缓存短信验证码
let keyMap = new Map();

/**
 * 两阶段验证控制器
 */
class auth2step extends facade.Control
{
    /**
     * 自定义中间件，跳过默认用户认证中间件 authHandle
     */
    get middleware(){
        return ['parseParams', 'commonHandle'];
    }

    /**
     * 配置URL路由，用户可以直接经由页面访问获取签名数据集
     */
    get router() {
        return [
            [`/${auth2step.name}`, 'auth'],        //定义发放签名功能的路由路径和处理函数
        ];
    }

    /**
     * 生成签名，放入哈希表，将哈希键通过短信发送给用户
     * 后续用户收到短信验证码后，填入openkey字段，连同openid一并提交验证
     * 
     * 注意：这不是控制器方法，而是一个路由调用，可以在未登录状态下调用
     * @param {*} params 
     */
    async auth(params) {
        let uinfo = typeof params.oemInfo == 'string' ? JSON.parse(params.oemInfo) : params.oemInfo;
        let ret = null;

        //检测是否存在原有签名，是否过期
        if(keyMap.get(uinfo.address)) {
            ret = signMap.get(keyMap.get(uinfo.address));
            if(!!ret && Math.abs(ret.t - now()) <= 60) {
                return ret; //返回现有签名，避免重复下发
            }
        }

        //生成新的签名
        ret = {
            t: now(),                             //当前时间戳，游戏方必须验证时间戳，暂定有效期为当前时间前后 5 分钟
            nonce: Math.random()*1000 | 0,        //随机数
            addrType: uinfo.addrType || 'phone',  //地址类型，'phone'
            address: uinfo.address,               //地址内容，如手机号码
            openid: uinfo.openid,                 //用户上行的认证标识
        };
        if(!!uinfo.openkey) {
            ret.openkey = uinfo.openkey;          //用户上行的登录密码(已加密)
        }

        //生成签名字段        
        let $sign = sign(ret, this.core.options[auth2step.name].game_secret);
        //用签名字段生成6位数字的字符串键值
        $sign = (this.core.service.gamegoldHelper.remote.hash256(Buffer.from($sign, 'utf8')).readUInt32LE(0, true) % 1000000).toString();
        //放入缓存表
        signMap.set($sign, ret);
        keyMap.set(uinfo.address, $sign);

        //向用户发送短信或邮件
        this.core.notifyEvent('sys.sendsms', {params:{addrType: uinfo.addrType, address: uinfo.address, content: $sign}});

        return ret;
    }

    /**
     * 查询短信验证码，注意只是测试阶段开放
     * @param {*} objData 
     */
    async getKey(user, objData) {
        if(!this.core.options.debug) {
            throw new Error('authThirdPartFailed');
        }

        if(keyMap.has(objData.address)) {
            return {code: 0, data: keyMap.get(objData.address)};
        } else {
            return {code: ReturnCode.userIllegal};
        }
    }

    /**
     * 验签函数，注意这不是一个控制器方法，而是由 authHandle 中间件自动调用的内部接口，并不面向客户端
     * @param {*} user 
     * @param {Object} params {auth: {openid, openkey, addrType, address}}
     */
    async check(params) {
        if(!signMap.has(params.auth.captcha)) {
            throw new Error('authThirdPartFailed');
        }

        let item = signMap.get(params.auth.captcha);

        let _sign = (item.address == params.address && item.nonce == params.auth.nonce);
        let _exp = (Math.abs(item.t - now()) <= 300);
        if (!_sign || !_exp) {
            throw new Error('authThirdPartFailed');
        }

        let ret = {
            domain: auth2step.name, 
            openid: item.openid, 
            addrType: item.addrType, 
            address: item.address
        };
        if(!!item.openkey) {
            ret.openkey = item.openkey;
        }
        switch(item.addrType) {
            default: {
                //查询历史用户信息
                let history = this.core.GetObject(EntityType.User, item.address, IndexType.Phone);
                if(!!history) { //手机号码已经先期注册过了，返回已注册用户证书
                    ret.openid = history.openid; //覆盖用户标识
                    ret.domain = history.domain; //覆盖登录域
                }
                break;
            }
        }

        //通过验证后，返回用户证书
        return ret;
    }

    /**
     * 获取用户档案文件，注意这不是一个控制器方法，而是由 authHandle 中间件自动调用的内部接口，并不面向客户端
     * @param {*} oemInfo 
     */
    async getProfile(oemInfo) {
        let ret = {
            domain: oemInfo.domain,
            openid : oemInfo.openid,
            phone: oemInfo.address,
            nickname: oemInfo.nickname || `vallnet${(Math.random()*1000000)|0}`,
            avatar_uri: oemInfo.headimgurl || './static/img/icon/mine_no.png',
            acaddr: oemInfo.acaddr || '',
            unionid: oemInfo.openid,
            sex: 1,
            country: 'cn',
            province: '',
            city: '',
            prop_count: 0,
            current_prop_count: 0,
        }
        if(!!oemInfo.openkey) {
            ret.openkey = oemInfo.openkey;
        }
        return ret;
    }
}

exports = module.exports = auth2step;
