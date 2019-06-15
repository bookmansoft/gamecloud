let facade = require('../../facade/Facade')
let {MiddlewareParam, ReturnCode, EntityType, IndexType, UserStatus, DomainType, GetDomainType,RecordType} = facade.const
let CommonFunc = facade.util

/**
 * 游戏玩家认证鉴权
 * @param {MiddlewareParam} sofar
 */
async function handle(sofar) {
    let ret = { ret: 0 };

    try {
        //根据令牌进行鉴权
        if(!sofar.socket.user){
            sofar.socket.user = await sofar.facade.GetObject(EntityType.User, sofar.msg.oemInfo.token, IndexType.Token);
        }

        if (!sofar.socket.user || sofar.msg.func == "login"/*如果是login则强制重新验证*/) {
            //针对各类第三方平台，执行一些必要的验证流程：
            switch(GetDomainType(sofar.msg.oemInfo.domain)) {
                case DomainType.TX: { //QQ游戏开发平台, 前向校验下用户的合法性
                        if (!sofar.facade.options.debug) {
                            ret = await sofar.facade.service.txApi.Get_Info(sofar.msg.oemInfo.openid, sofar.msg.oemInfo.openkey, sofar.msg.oemInfo.pf, sofar.msg.userip);
                        }
                        if (ret.ret != 0) { //验证未通过
                            sofar.fn({ code: ReturnCode.authThirdPartFailed, data: ret });
                            sofar.recy = false;
                            return;
                        }
                        ret.openid = sofar.msg.oemInfo.openid;
                        ret.openkey = sofar.msg.oemInfo.openkey;
                        ret.pf = sofar.msg.oemInfo.pf;
                        break;
                    }

                default: {
                        if(!!sofar.msg.oemInfo.auth) {
                            if(!!sofar.msg.oemInfo.authControl) { //自定义验签流程
                                try {
                                    sofar.msg.oemInfo.openid = await sofar.facade.control[sofar.msg.oemInfo.authControl].check(sofar.msg.oemInfo);
                                } catch(e) {
                                    sofar.fn({ code: ReturnCode.authThirdPartFailed });
                                    sofar.recy = false;
                                    return;
                                }
                            } else { // 通用验签流程
                                let _sign = (sofar.msg.oemInfo.auth.sign == facade.util.sign(sofar.msg.oemInfo.auth, sofar.facade.options[DomainType.D360].game_secret));
                                let _exp = (Math.abs(sofar.msg.oemInfo.auth.t - CommonFunc.now()) <= 300);
                                if (!_sign || !_exp) {
                                    sofar.fn({ code: ReturnCode.authThirdPartFailed });
                                    sofar.recy = false;
                                    return;
                                }
                                sofar.msg.oemInfo.openid = sofar.msg.oemInfo.auth.plat_user_id;
                            }
                        }
                        sofar.msg.domainId = `${sofar.msg.oemInfo.domain}.${sofar.msg.oemInfo.openid}`;
                        break;
                    }
            }

            sofar.msg.oemInfo.token = facade.util.sign({ did: sofar.msg.domainId }, sofar.facade.options.game_secret); //为用户生成令牌
            
            let usr = sofar.facade.GetObject(EntityType.User, sofar.msg.domainId, IndexType.Domain);
            if (!!usr) {//老用户登录
                usr.socket = sofar.socket; //更新通讯句柄
                usr.userip = sofar.msg.userip;
                sofar.socket.user = usr;

                usr.baseMgr.info.UnsetStatus(UserStatus.isNewbie, false);
                if (!!usr.socket && usr.socket != sofar.socket) {
                    //禁止多点登录
                    sofar.facade.notifyEvent('socket.userKick', {sid:usr.socket});
                }
            }
            else if (!!sofar.msg.oemInfo.openid) {//	新玩家注册
                //sofar.msg.func = 'login'; //强制登录
                let name;
                if(!!sofar.msg.userinfo){
                    name = sofar.msg.userinfo.nick;
                }else{
                    name = '猴子' + facade.util.rand(10000, 99999);	  //随机名称
                }
                let appId = '';												    //应用ID    
                let serverId = '';												//服务器ID

                let oemInfo = sofar.msg.oemInfo;
                // if (oemInfo.userName) {
                //     name = oemInfo.userName;
                // }
                if (oemInfo.appId) {
                    appId = oemInfo.appId;
                }
                if (oemInfo.serverId) {
                    serverId = oemInfo.serverId;
                }

                usr = await sofar.facade.GetMapping(EntityType.User).Create(name, oemInfo.domain, oemInfo.openid);
                if (!!usr) {
                    usr.socket = sofar.socket; //更新通讯句柄
                    usr.userip = sofar.msg.userip;
                    sofar.socket.user = usr;

                    //写入账号信息
                    usr.WriteUserInfo(appId, serverId, CommonFunc.now(), sofar.msg.oemInfo.token);
                    sofar.facade.notifyEvent('user.newAttr', {user: usr, attr:[{type:'uid', value:usr.id}, {type:'name', value:usr.name}]});
                    sofar.facade.notifyEvent('user.afterRegister', {user:usr});
                }
            }

            if (!!usr) {
                if(sofar.facade.options.debug){//模拟填充测试数据/用户头像信息
                    ret.figureurl = facade.config.fileMap.DataConst.user.icon;
                }
                sofar.facade.notifyEvent('user.afterLogin', {user:usr, objData:sofar.msg});//发送"登录后"事件
                if(usr.domainType == DomainType.TX) { //设置腾讯会员属性
                    await usr.SetTxInfo(ret); //异步执行，因为涉及到了QQ头像的CDN地址转换
                }
                usr.sign = sofar.msg.oemInfo.token;         //记录登录令牌
                usr.time = CommonFunc.now();                //记录标识令牌有效期的时间戳
                sofar.facade.GetMapping(EntityType.User).addId([usr.sign, usr.id],IndexType.Token); //添加一定有效期的令牌类型的反向索引
            }
        }

        if (!sofar.socket.user) {//未通过身份校验
            sofar.fn({ code: ReturnCode.userIllegal });
            sofar.recy = false;
        }
        else {
            //console.log(`鉴权成功, OpenId/Token: ${sofar.msg.oemInfo.openid}/${sofar.msg.oemInfo.token}`);
            //分发用户上行报文的消息，可以借此执行一些刷新操作
            sofar.facade.notifyEvent('user.packetIn', {user: sofar.socket.user});
        }
    }
    catch (e) {
        console.log(e);
        sofar.fn({ code: ReturnCode.illegalData, data: ret });
        sofar.recy = false;
    }
}

module.exports.handle = handle;
