let facade = require('../../../Facade')
let crypto = require('crypto');
let {EntityType, IndexType, ReturnCode} = facade.const
const salt = "038292cfb50d8361a0feb0e3697461c9";

/**
 * 用户认证控制器 - 使用用户名/密码验证
 * @description 
 *  用户名/密码验证模式仍旧依赖两阶段验证完成注册
 *  它仅仅完成验证，返回的用户证书仍然是两阶段认证生成的证书
 */
class authpwd extends facade.Control
{
    /**
     * 返回自定义中间件序列
     * @description 该序列不包含鉴权中间件，意味着该控制器可以被匿名访问
     */
    get middleware() {
        return ['parseParams', 'commonHandle'];
    }

    /**
     * 重置密码
     * @param {*} user 
     * @param {*} params 
     */
    async resetPassword(user, params) {
        let uinfo = params.oemInfo;
        if(typeof uinfo == 'string') {
            uinfo = JSON.parse(uinfo);
        }
        let pUser = this.core.GetObject(EntityType.User, `auth2step.${uinfo.openid}`, IndexType.Domain);
        if(!!pUser) {
            let pwd = ((Math.random() * 1000000) | 0).toString();
            while(pwd.length < 6) { //补足6位
                pwd += '0';
            }
            pUser.SetAttr('password', crypto.createHash("sha1").update(pwd + salt).digest("hex"));
            pUser.Save();
            this.core.service.mail.send({
                addr: pUser.openid, 
                subject: 'Reset Password', 
                content: `password reset to ${pwd}`, 
                html: `You have reset password to ${pwd}, Visit <a href="www.vallnet.cn">Vallnet</a> for more info.`
            });
            return {code: 0};
        }

        return {code: -1};
    }

    /**
     * 验证密码函数
     * @description 该函数并非外部控制器方法，而是由鉴权中间件(authHandle)自动调用的内部接口，提供基于用户名/密码校验模式的身份校验
     * @param {Object} params
     */
    check(params) {
        //查询两阶段认证期间生成的用户对象
        let usr = this.core.GetObject(EntityType.User, `auth2step.${params.openid}`, IndexType.Domain);

        //验证用户是否否存在，密码是否正确
        if (!usr || params.openkey !== usr.GetAttr('password')) {
            throw(new Error('登录失败，用户不存在或密码错'));
        }
        //验证通过，返回用户资料
        return {
            domain : 'auth2step',       //注意返回的证书类型，仍旧是两阶段认证
            openid : usr.openid,
            openkey : usr.GetAttr('password'),
            nickname: usr.openid,
            avatar_uri: usr.baseMgr.info.getAttr("avatar_uri") || './static/img/icon/mine_no.png',
            unionid: usr.openid,
        }
    }
    
    /**
     * 为新增用户提供默认的用户档案
     * @description 该函数并非外部控制器方法，而是由鉴权中间件(authHandle)自动调用的内部接口
     * @param {*} params 
     */
    async getProfile(params) {
        return {
            domain : 'auth2step',      //注意返回的证书类型，仍旧是两阶段认证
            openid : params.openid,
            openkey: params.openkey,
            nickname: params.nickname || `vallnet${(Math.random()*1000000)|0}`,
            avatar_uri: params.headimgurl || './static/img/icon/mine_no.png',
            unionid: params.openid,
            remark: params.remark,
            state: 1,
        }
    }
}

exports = module.exports = authpwd;
