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
            sofar.socket.user = await facade.GetObject(EntityType.User, sofar.msg.oemInfo.token, IndexType.Token);
        }

        if (!sofar.socket.user || sofar.msg.func == "login"/*如果是login则强制重新验证*/) {
            //针对各类第三方平台，执行一些必要的验证流程：
            switch(GetDomainType(sofar.msg.oemInfo.domain)) {
                case DomainType.TX: { //QQ游戏开发平台, 前向校验下用户的合法性
                        if (!sofar.facade.options.debug) {
                            ret = await sofar.facade.service.txApi.Get_Info(sofar.msg.oemInfo.openid, sofar.msg.oemInfo.openkey, sofar.msg.oemInfo.pf, sofar.msg.userip);
                        }
                        if (ret.ret != 0) { //验证未通过
                            //sofar.facade.counter.inc(); //pm2监控：错误计数，目前已经禁用
                            sofar.fn({ code: ReturnCode.authThirdPartFailed, data: ret });
                            sofar.recy = false;
                            return;
                        }
                        ret.openid = sofar.msg.oemInfo.openid;
                        ret.openkey = sofar.msg.oemInfo.openkey;
                        ret.pf = sofar.msg.oemInfo.pf;
                        break;
                    }

                case DomainType.D360: {//360平台，本地校验
                        // auth = {
                        //     t: 当前时间戳，游戏方必须验证时间戳，暂定有效 期为当前时间前后 5 分钟
                        //     nonce: 随机数
                        //     plat_user_id: 平台用户 ID
                        //     nickname: 用户昵称
                        //     avatar: 头像
                        //     is_tourist: 是否为游客
                        // };
                        let _sign = (sofar.msg.oemInfo.auth.sign == facade.util.sign(sofar.msg.oemInfo.auth, sofar.facade.options[DomainType.D360].game_secret));
                        let _exp = (Math.abs(sofar.msg.oemInfo.auth.t - CommonFunc.now()) <= 300);
                        if (!_sign || !_exp) {
                            sofar.fn({ code: ReturnCode.authThirdPartFailed });
                            sofar.recy = false;
                            return;
                        }
                        //360认证模式不同于TX，此处要对domainId、openid重新赋值
                        sofar.msg.oemInfo.openid = sofar.msg.oemInfo.auth.plat_user_id;
                        sofar.msg.domainId = sofar.msg.oemInfo.domain + '.' + sofar.msg.oemInfo.openid;
                        break;
                    }

                case DomainType.OFFICIAL: {
                        if(!!sofar.msg.oemInfo.auth){//用于兼容直连模式下的单元测试，为其转换产生openid
                            let _sign = (sofar.msg.oemInfo.auth.sign == facade.util.sign(sofar.msg.oemInfo.auth, sofar.facade.options[DomainType.D360].game_secret));
                            let _exp = (Math.abs(sofar.msg.oemInfo.auth.t - CommonFunc.now()) <= 300);
                            if (!_sign || !_exp) {
                                sofar.fn({ code: ReturnCode.authThirdPartFailed });
                                sofar.recy = false;
                                return;
                            }
                            sofar.msg.oemInfo.openid = sofar.msg.oemInfo.auth.plat_user_id;
                        }
                        sofar.msg.domainId = sofar.msg.oemInfo.domain + '.' + sofar.msg.oemInfo.openid;
                        break;
                    }
            }
            //sofar.msg.oemInfo.token = facade.util.sign({ did: sofar.msg.domainId }, sofar.facade.options.game_secret); //为用户生成令牌
            sofar.msg.oemInfo.token = sofar.msg.token;
            //获取token
            let address = null; //sofar.msg.token.data.addr;
            let usr = facade.GetObject(EntityType.User, sofar.msg.domainId, IndexType.Domain);
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

                usr = await facade.GetMapping(EntityType.User).Create(name, oemInfo.domain, oemInfo.openid);
                if (!!usr) {
                    usr.socket = sofar.socket; //更新通讯句柄
                    usr.userip = sofar.msg.userip;
                    sofar.socket.user = usr;

                    //写入账号信息
                    usr.WriteUserInfo(appId, serverId, CommonFunc.now(), sofar.msg.oemInfo.token);
                    if(!!address){
                        usr.getInfoMgr().SetRecord(RecordType.address,address);//info字段中添加address
                    }
                    sofar.facade.notifyEvent('user.newAttr', {user: usr, attr:[{type:'uid', value:usr.id}, {type:'name', value:usr.name}]});
                    sofar.facade.notifyEvent('user.afterRegister', {user:usr});
                }
            }

            if (!!usr) {
                if(sofar.facade.options.debug){//模拟填充测试数据/用户头像信息
                    ret.figureurl = facade.configration.DataConst.user.icon;
                }
                //console.log(usr.getPocket().getList());获得当前用户的item
                sofar.facade.notifyEvent('user.afterLogin', {user:usr, objData:sofar.msg});//发送"登录后"事件
                if(usr.domainType == DomainType.TX) { //设置腾讯会员属性
                    await usr.SetTxInfo(ret); //异步执行，因为涉及到了QQ头像的CDN地址转换
                }
                usr.sign = sofar.msg.oemInfo.token;         //记录登录令牌
                usr.time = CommonFunc.now();                //记录标识令牌有效期的时间戳
                facade.GetMapping(EntityType.User).addId([usr.sign, usr.id],IndexType.Token); //添加一定有效期的令牌类型的反向索引
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
