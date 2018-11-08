/**
 * 单元测试：QQGame SDK接入
 * Creted by liub 2017.3.24
 *
 * 第三方接口（腾讯）概述：
 * 1、第三方接口主要包括服务端认证和支付接口，还可能包含扩展的数据上报接口
 * 2、当前对认证接口的理解：
 *      1、客户端向 TX 请求 openid、openkey
 *      2、客户端携带 openid 和 openkey 登录，服务端前向到 TX 验证，验证通过则准予登录。
 *
 *      注1：部分第三方接口流程有所不同：
 *      1、客户端向 网关 请求 openid、openkey。网关同步向客户端、服务端回写Token信息
 *      2、客户端携带 openid 和 openkey 登录，服务端根据先前缓存的openid、openkey键值对进行验证，验证通过则准予登录。
 *
 *      注2：需要协调id、uuid、tx/openid以及其他第三方护照间的关系
 *
 * 3、当前对支付接口的理解：
 *      1、前端将用户点击游戏中的充值选择发送给SERVER
 *      2、server根据用户选择制作参数=》请求腾讯支付API=》返回此次支付相关的参数
 *      3、Server转发返回的参数给前端
 *      4、前端把参数放入腾讯JS API并调用=》启动腾讯支付介面=》支付成功
 *      5、腾讯回调SERVER发货API，SERVER为用户充值虚拟币，将结果推送给前端
 *
 * 游戏模拟登录接口：http://app1105896476.openwebgame.qq.com/qzone
 */

function purchaseOfTx(remote, cb, idx){
    let tradeNo = "";
    remote.fetch({func:"shop.BuyItem", "to": !!idx ? idx : 0}, msg =>{
        //remote.log(msg);
        remote.expect(msg.code).to.be.equal(remote.const.ReturnCode.Success);    //操作成功
        remote.expect(msg.data).to.not.be.empty;
        remote.expect(msg.data.order_id).to.not.be.empty; //订单号
        remote.expect(msg.data.notify_url).to.not.be.empty; //服务端回调地址
        remote.expect(msg.data.plat_user_id).to.not.be.empty; //用户UUID
        tradeNo = msg.data.order_id; //记录订单号，方便后面做校验
        remote.log(msg.data);

        //客户端使用前述流程获取的参数，向tx发起支付流程，此处略过。。。

        //模拟回调我方服务端的流程：此举导致服务端下行notify，从而完成整个case
        remote.fetch({
            openid:msg.data.plat_user_id,
            billno: msg.data.order_id,
            amt:msg.data.amount
        }, msg => {
            cb(msg);
        }, msg.data.notify_url);
    });
}

exports = module.exports = {
    purchaseOfTx: purchaseOfTx,
}