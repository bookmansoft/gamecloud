let crypto = require('crypto'); //加密模块
let facade = require('../../../Facade')
let req = require('../../../util/req') //异步http请求
let sys = facade.ini.servers["CoreOfIndex"][1]; //索引服运行参数

/**
 * 腾讯移动大厅接入API
 *
 * @note
 *      1、腾讯返回的ret：0 就说明API正常返回了，如果返回其它值就查看一下http://wiki.open.qq.com/wiki/%E5%85%AC%E5%85%B1%E8%BF%94%E5%9B%9E%E7%A0%81%E8%AF%B4%E6%98%8E#OpenAPI_V3.0_.E8.BF.94.E5.9B.9E.E7.A0.81
 *      2、appkey和pay_appkey作为加密时的附加密钥时，腾讯规定尾部要添加一个"&"，因此索性直接配置在了sys.json中
 */
class txApi extends facade.Service
{
    /**
     * 构造函数
     */
    constructor(parent){
        super(parent);
    }

    //region ********** 数据上报类API ********************

    /**
     使用场景：实时在线,  此字段仅针对接入互娱平台明星计划的应用有效
     请按照以下标准统计在线人数后上报数据：
     1) 用户登录进入游戏，在线数据+1
     2) 用户关闭浏览器，退出游戏，在线数据-1
     3) 游戏服务器每5分钟保持与客户端的通信判断用户是否异常推出
     4) 游戏每5分钟上报一次在线数据
     */
    Report_Online(pf, usernum) {
        var reporttime = facade.util.now;
        var domain = this.getReportDomain(pf);
        var reportapi = sys.tx.reportApiUrl + '/stat/report_online.php';
        var params = '?version=1' + '&appid=' + sys.tx.appid + '&svrip=' + this.getIPAdress() + '&time=' + reporttime
            + '&domain=' + domain + '&worldid=1' + '&user_num=' + usernum;
        reportapi += params;

        req.pGetUrl(reportapi).catch(e=>{
            console.log(e);
        });
    }

    // /**
    //  * 上报的API都使用异步的方法,正常的返回{ ret: 0, msg: 'succ' }
    //  * 使用场景：登录,  gameid 游戏中的唯一indexid,source:用来记录注册来源，没有的就把pf传入source吧
    //  *
    //  * @param openid
    //  * @param pf
    //  * @param userip
    //  * @param gameid
    //  * @param source
    //  */
    // Report_Login(openid, pf, userip, gameid, source) {
    //     var reporttime = facade.util.now;
    //     var domain = this.getReportDomain(pf);
    //     var reportapi = sys.tx.reportApiUrl + '/stat/report_login.php';
    //     var params = '?version=1' + '&appid=' + sys.tx.appid + '&userip=' + userip + '&svrip=' + this.getIPAdress() + '&time=' + reporttime
    //         + '&domain=' + domain + '&worldid=1' + '&opuid=' + gameid + '&opopenid=' + openid + '&source=' + source;
    //     reportapi += params;
    //
    //     req.pGetUrl(reportapi).catch(e=>{
    //         console.log(e);
    //     });
    // }

    /**
     * 使用场景：主动注册
     * @param openid
     * @param pf
     * @param userip
     * @param gameid    gameid 游戏中的唯一indexid
     * @param source    用来记录注册来源，没有的就把pf传入source吧
     */
    Report_Register(openid, pf, userip, gameid, source) {
        var reporttime = facade.util.now;
        var domain = this.getReportDomain(pf);
        var reportapi = sys.tx.reportApiUrl + '/stat/report_register.php';
        var params = '?version=1' + '&appid=' + sys.tx.appid + '&userip=' + userip + '&svrip=' + this.getIPAdress() + '&time=' + reporttime
            + '&domain=' + domain + '&worldid=1' + '&opuid=' + gameid + '&opopenid=' + openid + '&source=' + source;
        reportapi += params;

        req.pGetUrl(reportapi).catch(e=>{
            console.log(e);
        });
    }

    /**
     * 使用场景：接受邀请注册
     * @param openid
     * @param pf
     * @param userip
     * @param gameid    游戏中的唯一indexid
     * @param source    用来记录注册来源，没有的就把pf传入source吧
     * @constructor
     */
    Report_Accept(openid, pf, userip, gameid, source) {
        var reporttime = facade.util.now;
        var domain = this.getReportDomain(pf);
        var reportapi = sys.tx.reportApiUrl + '/stat/report_accept.php';
        var params = '?version=1' + '&appid=' + sys.tx.appid + '&userip=' + userip + '&svrip=' + this.getIPAdress() + '&time=' + reporttime
            + '&domain=' + domain + '&worldid=1' + '&opuid=' + gameid + '&opopenid=' + openid + '&source=' + source;
        reportapi += params;

        req.pGetUrl(reportapi).catch(e=>{
            console.log(e);
        });
    }

    /**
     * 使用场景：退出
     * @param openid
     * @param pf
     * @param userip
     * @param gameid
     * @param source
     * @param onlinetime    用户本次登录的在线时长(秒)
     * @constructor
     */
    Report_Quit(openid, pf, userip, gameid, source, onlinetime) {
        var reporttime = facade.util.now;
        var domain = this.getReportDomain(pf);
        var reportapi = sys.tx.reportApiUrl + '/stat/report_quit.php';
        var params = '?version=1' + '&appid=' + sys.tx.appid + '&userip=' + userip + '&svrip=' + this.getIPAdress() + '&time=' + reporttime
            + '&domain=' + domain + '&worldid=1' + '&opuid=' + gameid + '&opopenid=' + openid + '&source=' + source + '&onlinetime=' + onlinetime;
        reportapi += params;

        req.pGetUrl(reportapi).catch(e=>{
            console.log(e);
        });
    }

    /**
     * 使用场景：邀请他人注册
     * @param openid
     * @param pf
     * @param userip
     * @param gameid        游戏中的唯一IndexId
     * @param source        用来记录注册来源，没有的就把pf传入source吧
     * @param igameid       邀请人游戏中的唯一IndexId
     * @param iopenid       邀请人的opeind
     */
    Report_Invite(openid, pf, userip, gameid, source, igameid, iopenid) {
        if(!igameid)
            igameid = '';
        if(!iopenid)
            iopenid = '';
        var reporttime = facade.util.now;
        var domain = this.getReportDomain(pf);
        var reportapi = sys.tx.reportApiUrl + '/stat/report_invite.php';
        var params = '?version=1' + '&appid=' + sys.tx.appid + '&userip=' + userip + '&svrip=' + this.getIPAdress() + '&time=' + reporttime
            + '&domain=' + domain + '&worldid=1' + '&opuid=' + gameid + '&opopenid=' + openid
            + '&source=' + source + '&touid=' + igameid + '&toopenid=' + iopenid;
        reportapi += params;

        req.pGetUrl(reportapi).catch(e=>{
            console.log(e);
        });
    }

    /**
     * 使用场景：支付消费
     * @param openid
     * @param pf
     * @param userip
     * @param gameid
     * @param source
     * @param modifyfee     Q点如果没有变化，则填0,上报单位为Q分（100Q分 = 10Q点 = 1Q币）
     * @constructor
     */
    Report_Consume(openid, pf, userip, gameid, source, modifyfee) {
        var reporttime = facade.util.now;
        var domain = this.getReportDomain(pf);
        var reportapi = sys.tx.reportApiUrl + '/stat/report_consume.php';
        var params = '?version=1' + '&appid=' + sys.tx.appid + '&userip=' + userip + '&svrip=' + this.getIPAdress() + '&time=' + reporttime
            + '&domain=' + domain + '&worldid=1' + '&opuid=' + gameid + '&opopenid=' + openid + '&modifyfee=' + modifyfee
            + '&source=' + source;
        reportapi += params;

        req.pGetUrl(reportapi).catch(e=>{
            console.log(e);
        });
    }

    /**
     * 使用场景：支付充值
     * @param openid
     * @param pf
     * @param userip
     * @param gameid
     * @param source
     * @param modifyfee     Q点如果没有变化，则填0,上报单位为Q分（100Q分 = 10Q点 = 1Q币）
     * @constructor
     */
    Report_Recharge(openid, pf, userip, gameid, source, modifyfee) {
        var reporttime = facade.util.now;
        var domain = this.getReportDomain(pf);
        var reportapi = sys.tx.reportApiUrl + '/stat/report_recharge.php';
        var params = '?version=1' + '&appid=' + sys.tx.appid + '&userip=' + userip + '&svrip=' + this.getIPAdress() + '&time=' + reporttime
            + '&domain=' + domain + '&worldid=1' + '&opuid=' + gameid + '&opopenid=' + openid + '&modifyfee=' + modifyfee
            + '&source=' + source;
        reportapi += params;

        req.pGetUrl(reportapi).catch(e=>{
            console.log(e);
        });
    }

    //endregion

    //region ********** 用户信息类API ********************

    /**
     * 验证用户是否登录
     *
     * @param openid
     * @param openkey
     * @param pf
     * @returns {Promise.<{}>}
     */
    Is_Login(openid, openkey, pf) {
        pf = !!pf ? pf : sys.auth.pf;
        let userdata = {
            openid: openid,
            openkey: openkey,
            pf: pf
        };
        let apiname = "/v3/user/is_login";
        let data = this.createParams(userdata, apiname);
        let token = data.token;
        let requesturl = this.getOpenApiUrl() + apiname + "?" + data.strParams + "&sig=" + token;

        //console.log(requesturl);
        return req.pGetUrl(requesturl);
    }

    /**
     * 获取用户信息
     * @param openid
     * @param openkey
     * @param pf
     * @returns {Promise.<{}>}
     */
    Get_Info(openid, openkey, pf, userip) {
        pf = !!pf ? pf : sys.auth.pf;
        let userdata = {
            openid: openid,
            openkey: openkey,
            pf: pf,
            userip: userip
        };
        let apiname = "/v3/user/get_info";
        let data = this.createParams(userdata, apiname);
        let token = data.token;
        let requesturl = this.getOpenApiUrl() + apiname + "?" + data.strParams + "&sig=" + token;

        //console.log(requesturl);
        return req.pGetUrl(requesturl);
    }

    buy_playzone_item(openid, openkey, pf, userip, zoneid, appid, itemid, count) {
        pf = !!pf ? pf : sys.auth.pf;
        let userdata = {
            openid: openid,
            zoneid: zoneid,
            openkey: openkey,
            appid: appid,
            itemid: itemid,
            count: count,
            pf: pf,
            format: "json",
            userip: userip
        };
        let apiname = "/v3/user/buy_playzone_item";
        let data = this.createParams(userdata, apiname);
        let requesturl = this.getOpenApiUrl() + apiname + "?" + data.strParams + "&sig=" + data.token;
        return req.pGetUrl(requesturl);
    }

    /**
     * 返回指定用户的基本信息
     * @param openid
     * @param openkey
     * @param pf
     * @param fopenids 需要获取数据的openid列表，中间以_隔开，每次最多100个。
     * @returns {Promise.<{}>}
     *
     * @note
     * 注意如果使用GET方式传100个openid是超过2048字节限制的，所以如果需要传100个openid请使用POST方法。
     * 此方法只会返回安装过当前应用的好友信息，否则会返回-5(-5的意思是验证失败)这点要注意
     */
    async Get_Multi_Info(openid, openkey, pf, fopenids) {
        var userdata = {};
        userdata.openid = openid;
        userdata.openkey = openkey;
        userdata.pf = pf;
        userdata.fopenids = fopenids;
        var apiname = "/v3/user/get_multi_info";
        var data = this.createParams(userdata, apiname);
        var token = data.token;
        var requesturl = this.getOpenApiUrl() + apiname + "?" + data.strParams + "&sig=" + token;

        try{
            //console.log(requesturl);
            return await req.pGetUrl(requesturl);
        }
        catch(e){
            return {};
        }
    }

    /**
     * 返回指定当前用户的自定义头像 flag 1: 40*40,2: 100*100,3: 140*140,4: 原始头像(只针对QQ会员提供)
     * @param openid
     * @param openkey
     * @param pf
     * @param flag
     * @returns {Promise.<{}>}
     */
    async Get_Figure(openid, openkey, pf,flag) {
        if (!flag || '' == flag)
            flag = 1;

        var userdata = {};
        userdata.openid = openid;
        userdata.openkey = openkey;
        userdata.pf = pf;
        userdata.flag = flag;
        var apiname = "/v3/user/get_figure";
        var data = this.createParams(userdata, apiname);
        var token = data.token;
        var requesturl = this.getOpenApiUrl() + apiname + "?" + data.strParams + "&sig=" + token;

        try{
            //console.log(requesturl);
            return await req.pGetUrl(requesturl);
        }
        catch(e){
            return {};
        }
    }

    /**
     * 获取QQGame的登录用户蓝钻信息信息
     * @param openid
     * @param openkey
     * @param pf
     * @returns {Promise.<{}>}
     */
    async Blue_VIP_Info(openid, openkey, pf, userip, appid) {
        pf = !!pf ? pf : sys.auth.pf;
        var userdata = {};
        userdata.openid = openid;
        userdata.openkey = openkey;
        userdata.pf = pf;
        userdata.appid = appid;
        userdata.userip = userip;
        var apiname = "/v3/user/blue_vip_info";
        var data = this.createParams(userdata, apiname);
        var token = data.token;
        var requesturl = this.getOpenApiUrl() + apiname + "?" + data.strParams + "&sig=" + token;

        try{
            return await req.pGetUrl(requesturl);
        }
        catch(e){
            return {};
        }
    }

    //endregion

    //region ********** 好友关系类API ********************

    /**
     * 获取关系链，包括用户IM及QQGame好友   	fopenid 传入好友openid
     * @param openid
     * @param openkey
     * @param pf
     * @param fopenid
     * @returns {Promise.<{}>}
     */
    async Is_Friend(openid, openkey, pf, fopenid) {
        pf = !!pf ? pf : sys.auth.pf;
        let userdata = {
            openid: openid,
            openkey: openkey,
            pf: pf,
            only_game_friends: onlygamefriends,
            fopenid: fopenid
        };

        let apiname = "/v3/relation/is_friend";
        let data = this.createParams(userdata, apiname);
        let requesturl = this.getOpenApiUrl() + apiname + "?" + data.strParams + "&sig=" + data.token;

        //console.log(requesturl);
        return req.pGetUrl(requesturl);
    }

    /**
     * 获取关系链，包括用户IM及QQGame好友
     * @param openid
     * @param openkey
     * @param pf
     * @param onlygamefriends 该值为1时代表只返回玩过同一款游戏的好友
     * @returns {Promise.<{}>}
     */
    async Get_App_Friends(openid, openkey, pf, appid, onlygamefriends) {
        pf = !!pf ? pf : sys.auth.pf;
        if (!onlygamefriends || '' == onlygamefriends)
            onlygamefriends = 0;

        let userdata = {
            openid: openid,
            openkey: openkey,
            appid: appid,
            pf: pf,
            format: "json",
            only_game_friends: onlygamefriends,
        };
        let apiname = "/v3/relation/get_app_friends";
        let data = this.createParams(userdata, apiname);
        let requesturl = this.getOpenApiUrl() + apiname + "?" + data.strParams + "&sig=" + data.token;
        try {
            return await req.pGetUrl(requesturl);
        }
        catch (e) {
            throw e;
        }
    }

    //endregion

    //region ********** 支付类API ********************

    //  itemdata.payitem = '2001*90*10';//item:2001 price:90 num:10
    //  itemdata.goodsmeta = '道具*测试';
    //  itemdata.goodsurl = 'http://minigame.qq.com/plat/social_hall/app_frame/demo/img/pic_02.jpg';
    //  itemdata.zoneid = 1;//分区ID,没有分区就传1
    //  itemdata.appmode = 1;//1表示不可以修改物品数量 2.表示可以用户可以选选择物品数量 默认2
    //  itemdata.max_num = 10;//可以批量购买的最大数量,appmode=2的时候才有效
    //  userdata.amt = '900';//必需等于道具总价（可选的），还是不填吧

    /**
     * 查询余额接口
     * @param openid            187901A9B7A57FAFA4CDDF6DCB6276B2
     * @param openkey           5EE305999566761DBA270E6734C5B6CF
     * @param pf                qzone
     * @param pfkey             596f233c3e1d73d5428dc2522ed0c313
     * @param zoneid            分区ID,没有分区就传1
     * @returns {Promise.<*>}
     */
    async Get_Balance_M(openid, openkey, pf, pfkey, zoneid) {
        var userdata = {};
        userdata.openid = openid;
        userdata.openkey = openkey;
        userdata.pf = pf;
        if (zoneid)
            userdata.zoneid = zoneid;
        else
            userdata.zoneid = 1;
        if (userdata.pfkey)
            userdata.pfkey = pfkey;
        else
            userdata.pfkey = 'pfkey';
        userdata.accounttype = 'common'; //默认基本货币:'common', 安全货币:'security'

        var apiname = "/mpay/get_balance_m";
        var data = this.createParams(userdata, "/v3/r/mpay/get_balance_m", true);//第三个参数，因为支付API使用的是PAYAPPID,所以当使用支付API的时候，要修改成true
        var token = data.token;
        var requesturl = this.getOpenApiUrl(true) + apiname + "?" + data.strParams + "&sig=" + token;

        try{
            //console.log(requesturl);
            return await req.pGetUrl(requesturl,{
                headers: {
                    'Cookie': 'session_id=openid;session_type=openkey;org_loc=' + encodeURIComponent("/v3/r/mpay/get_balance_m"),
                },
            });
        }
        catch(e){
            return {};
        }
    }

    /**
     * 直购下订单接口
     * @param openid
     * @param openkey
     * @param pf
     * @param pfkey             移动QQ的pfkey如果没有就传固定值'pfkey'
     * @param itemdata
     * @returns {Promise.<{}>}
     */
    Buy_Goods_M(openid, openkey, pf, pfkey, itemdata) {
        var userdata = {};
        userdata.openid = openid;
        userdata.openkey = openkey;
        userdata.pf = pf;
        if (userdata.pfkey)
            userdata.pfkey = pfkey;
        else
            userdata.pfkey = 'pfkey';

        userdata.payitem = itemdata.payitem;
        userdata.goodsmeta = itemdata.goodsmeta;
        userdata.goodsurl = itemdata.goodsurl;
        userdata.zoneid = itemdata.zoneid;
        userdata.appmode = itemdata.appmode;
        userdata.max_num = itemdata.max_num;

        var apiname = "/mpay/buy_goods_m";
        var data = this.createParams(userdata, "/v3/r/mpay/buy_goods_m", true);//第三个参数，因为支付API使用的是PAYAPPID,所以当使用支付API的时候，要修改成true
        var token = data.token;
        var requesturl = this.getOpenApiUrl(true) + apiname + "?" + data.strParams + "&sig=" + token;

        //console.log(requesturl);
        return req.pGetUrl(requesturl,{
            headers: {
                'Cookie': 'session_id=openid;session_type=openkey;org_loc=' + encodeURIComponent("/v3/r/mpay/buy_goods_m"),
            }
        });
    }
    /**
     * 拉取排行榜    await get_ranklist();
     * @param dimname     拉取纬度，类别一对应level，类别二对应key1，类别三对应key2
     * @param rank_start     拉取排行的起始位置（默认0）
     * @param pull_cnt     拉取排行的个数（最小为3，最大为50，默认3）
     * @param direction     拉取排行的方向（-1往前拉取，0向后拉取，默认0）
     */
    async get_ranklist(openid, openkey, pf,appid, dimname,rank_start, pull_cnt, direction) {
        pf = !!pf ? pf : sys.auth.pf;
        let userdata = {
            openid: openid,
            openkey: openkey,
            pf: pf,
            appid: appid,
            dimname:dimname,
            rank_start: rank_start,
            pull_cnt: pull_cnt,
            direction: direction
        };

        let apiname = "/v3/user/get_gamebar_ranklist";
        let data = this.createParams(userdata, apiname);
        let requesturl = this.getOpenApiUrl() + apiname + "?" + data.strParams + "&sig=" + data.token;

        try {
            return await req.pGetUrl(requesturl);
        }
        catch (e) {
            throw e;
        }
    }
    /**
     * invoke example for promise
     */
// function test() {
//     let rt = await get_ranklist();
//
//     // rt.then(ret=>{
//     //     console.log(ret);
//     // }).catch(e=>{
//     //     console.log(e);
//     // });
// }
    /**
     * 积分上报
     * @param level 用户等级。格式为uint。
     * @param area_name 用户所在的分区的名称，多区多服应用需要输入该参数，非多区多服应用不需要传。最多可传入30个字符，或10个汉字。格式为string。
     */
    async set_achievement(user, pf, score) {
        pf = !!pf ? pf : sys.auth.pf;
        let userdata = {
            openid: user.openid,
            openkey: user.baseMgr.txInfo.GetOpenKey(),
            pf: pf,
            userip: user.userip,
            user_attr:`{"level":${parseInt(score)}}`
        };

        let apiname = "/v3/user/set_achievement";
        let data = this.createParams(userdata, apiname);
        let requesturl = this.getOpenApiUrl() + apiname + "?" + data.strParams + "&sig=" + data.token;
        try {
            return await req.pGetUrl(requesturl);
        }
        catch (e) {
            throw e;
        }
    }

    /**
     * 发送玩吧消息
     * @param frd  好友openid 格式为string
     * @param msgtype 用消息类型，1-pk消息，2-送心消息，3-自定义消息 格式为int
     * @param content 自定义消息内容 格式为string
     * @param qua 手机客户端标识，例如：V1_AND_QZ_4.9.3_148_RDM_T 格式为string
     */
    async send_gamebar_msg(user, frd, msgtype, content, qua) {
        let userdata = {
            openid: user.openid,
            openkey: user.baseMgr.txInfo.GetOpenKey(),
            pf: sys.auth.pf,
            appid: sys.tx.appid,
            frd: frd,
            msgtype: msgtype,
            content: content,
            qua: qua
        };

        let apiname = "/v3/user/send_gamebar_msg";
        let data = this.createParams(userdata, apiname);
        let requesturl = this.getOpenApiUrl() + apiname + "?" + data.strParams + "&sig=" + data.token;
        try {
            return await req.pGetUrl(requesturl);
        }
        catch (e) {
            throw e;
        }
    }


    /**
     * 用户第一次进入游戏并未创建角色上报此接口
     * http:// 123.207.109.247:9000/report/regaccount/{appid}/{pf}/{openid}
     *
     */
    async Report_Regaccount(openid){
        let requesturl = "http://123.207.109.247:9000/report/regaccount/"
        + sys.tx.appid + "/"
        + sys.auth.pf + "/"
        + openid;
        try{
            return await req.pGetUrl(requesturl);
        }
        catch(e){

        }
    }

    /**
     * 用户创建角色成功上报此接口
     * http:// 123.207.109.247:9000/report/regchar/{appid}/{pf}/{openid}
     *
     */
    async Report_Regchar(openid){
        let requesturl = "http://123.207.109.247:9000/report/regchar/"
            + sys.tx.appid + "/"
            + sys.auth.pf + "/"
            + openid;
        try{
            return await req.pGetUrl(requesturl);
        }
        catch(e){

        }
    }

    /**
     * 用户第一次进入游戏并未创建角色上报此接口
     * http:// 123.207.109.247:9000/report/pay/{appid}/{pf}/{openid}/{amt}/{paytype}
     * @param amt: 支付金额: 请上报实际支付RMB金额
     *  1Q币 = 1RMB，10金卷 =1RMB,  10秀币=1RMB,  10星币= 1RMB
     * @param paytype: 0 : Q币  1:金卷  2:秀币 3:星币
     *
     */
    async Report_Pay(openid,amt,paytype){
        let requesturl = "http://123.207.109.247:9000/report/pay/"
            + sys.tx.appid + "/"
            + sys.auth.pf + "/"
            + openid + "/"
            + amt + "/"
            + paytype;
        try{
            return await req.pGetUrl(requesturl);
        }
        catch(e){

        }
    }

    /**
     *  用户创建角色成功后每次进入游戏都上报此接口
     *  http:// 123.207.109.247:9000/report/login/{appid}/{pf}/{openid}
     * @param openid uesr.openid
     */
    async Report_Login(openid){
        let requesturl = "http://123.207.109.247:9000/report/login/"
            + sys.tx.appid + "/"
            + sys.auth.pf + "/"
            + openid;
        try{
            return await req.pGetUrl(requesturl);
        }
        catch(e){

        }
    }

    /**
     * 用户退出游戏上报此接口
     * http:// 123.207.109.247:9000/report/logout/{appid}/{pf}/{openid}
     * @param openid uesr.openid
     * @param onlinetime 单位为秒
     */
    async Report_Logout(openid,onlinetime){
        let requesturl = "http://123.207.109.247:9000/report/logout/"
            + sys.tx.appid + "/"
            + sys.auth.pf + "/"
            + openid + "/"
            + onlinetime;
        try{
            return await req.pGetUrl(requesturl);
        }
        catch(e){

        }
    }
    //endregion

    //region ********** 通用函数 ********************
    /**
     * openapi地址
     * @param bPayAPI
     * @returns {*}
     */
    getOpenApiUrl(bPayAPI) {
        if (bPayAPI){
            return sys.tx.openApiUrlWithPay;
        }
        else {
            return sys.tx.openApiUrl;
        }
    }

    /**
     * 获取domain值，数据上报使用的
     * @param pf
     * @returns {number}
     */
    getReportDomain(pf) {
        if (pf.indexOf('android') != -1)
            return 19;
        else if (pf.indexOf('ios') != -1)
            return 18;
        else
            return 10;
    }

    /**
     * 制作加密串，拼接参数
     * @param userdata
     * @param url
     * @param bPayApi
     * @returns {{strParams: string, token: string}}
     */
    createParams(userdata, url, bPayApi) {
        if (!userdata.openid || userdata.openid == "") {
            console.log("error:" + "txApiFunc.js," + "openid is incorrect!");
        }
        if (!userdata.openkey || userdata.openkey == "") {
            console.log("error:" + "txApiFunc.js," + "openkey is incorrect!");
        }
        userdata.appid = bPayApi ? sys.tx.pay_appid : sys.tx.appid;
        if (!userdata.userip || userdata.userip == "") {
            userdata.userip = this.getIPAdress();
        }
        userdata.format = "json";
        userdata.ts = facade.util.now;

        //按字母对参数排序
        var sdic = Object.keys(userdata).sort();
        //拼接参数
        var strParams = "";
        for (let ki in sdic) {
            strParams += sdic[ki] + "=" + userdata[sdic[ki]] + "&";
        }
        strParams = strParams.substr(0, strParams.length - 1);
        //制作加密SIG使用的字串
        let encodeStrParams = encodeURIComponent(strParams);
        while (-1 != encodeStrParams.indexOf('*')) {
            encodeStrParams = encodeStrParams.replace('*', '%2A');
        }
        //制作加密SIG使用的字串 end

        //制作url get 字串
        var GETParams = "";
        for (let ki in sdic) {
            var tmpstr = encodeURIComponent(userdata[sdic[ki]]);
            while (-1 != tmpstr.indexOf('*')) {
                tmpstr = tmpstr.replace('*', '%2A');
            }
            GETParams += sdic[ki] + "=" + tmpstr + "&";
        }
        GETParams = GETParams.substr(0, GETParams.length - 1);
        //制作url get 字串 end

        //对encode的参数和encode的apiurl拼接
        encodeStrParams = "GET&" + encodeURIComponent(url) + "&" + encodeStrParams;
        //生成验证串
        var token = encodeURIComponent(crypto.createHmac("sha1", bPayApi ? sys.tx.pay_appkey : sys.tx.appkey).update(encodeStrParams).digest().toString('base64'));

        //console.log({ "encodeStrParams": encodeStrParams, "token": token });
        return { "strParams": GETParams, "token": token };
    }

    /**
     * 验证发货回调的签名档
     * @param userdata      签名档
     * @param url           在腾讯平台注册的我方发货地址
     * @param ak            密钥 appkey
     * @returns {boolean}
     */
    checkPayCallbackSign(userdata, url, ak) {
        //拼接参数
        let strParams = "";
        //按字母对参数排序
        Object.keys(userdata).sort().map(key=>{
            if(key != "sig" && key != "cee_extend"){//排除不参与运算的字段
                strParams += key + "=" + userdata[key] + "&";
            }
        });
        strParams = strParams.substr(0, strParams.length - 1);

        //制作加密SIG使用的字串
        let encodeStrParams = encodeURIComponent(strParams);
        while (-1 != encodeStrParams.indexOf('*')) {
            encodeStrParams = encodeStrParams.replace('*', '%2A');
        }
        while (-1 != encodeStrParams.indexOf('-')) {
            encodeStrParams = encodeStrParams.replace('-', '%252D'); //?文档中明明说替换成 "%2D"，实战中要注意检验下
        }
        //对encode的参数和encode的apiurl拼接
        encodeStrParams = "GET&" + encodeURIComponent(url) + "&" + encodeStrParams;
        //检验验证串
        ak = !!ak ? ak : sys.tx.pay_appkey;
        let calc = encodeURIComponent(crypto.createHmac("sha1", ak + "&"/*这个槽点...*/).update(encodeStrParams).digest().toString('base64'));
        return userdata.sig == calc;
    }

    /**
     * 获取IP，正式环境的时候要传正式服务器的内网IP
     * @returns {*}
     */
    getIPAdress() {
        var interfaces = require('os').networkInterfaces();
        for (var devName in interfaces) {
            var iface = interfaces[devName];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                    return alias.address;
                }
            }
        }
    }

    //endregion

    //region Test only Start
    // let userdata = {
    //     openid: '912F64E9EC4880E3AA53D3829F61F505',//"715902E664EEB7FCCBD485B26E034F81",
    //     openkey: 'E83847743E0777281603950E5ACAB471',//"5EA3CD21BA805DC0100F79941D6E0114",
    //     pf: 'qq_m_qq-10021755-html5-10021755-qq-1105896476-912F64E9EC4880E3AA53D3829F61F505-android',
    //     pfkey: 'AB3B040AD002A9D4C6B4CF77C67ABADA',//'75d10e62e065dffd877f0e5f40a89cc2',
    // };
    // let itemdata = {
    //     payitem : '2001*90*10',//item:2001 price:90 num:10
    //     goodsmeta : '道具*测试',
    //     goodsurl : 'http://minigame.qq.com/plat/social_hall/app_frame/demo/img/pic_02.jpg',
    //     zoneid : 1,//分区ID,没有分区就传1
    //     appmode : 1,//1表示不可以修改物品数量 2.表示可以用户可以选选择物品数量 默认2
    //     max_num : 10,//可以批量购买的最大数量,appmode=2的时候才有效
    // };
    // let ret = this.Report_Online(userdata.pf, 100);
    // console.log(ret);
    //endregion Test only End
}

exports = module.exports = txApi;
