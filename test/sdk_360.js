/**
 * 单元测试：第三方接口 - 360
 * Creted by liub 2017.4.2
 *
 */
let {sign} = require('../facade/util/commonFunc');//  md5加密

/**
 * 购买指定商品 - 360流程
 * @param cb
 * @param idx
 */
function purchaseOf360(remote, cb, idx){
    let tradeNo = ""; //为了后续校验而提前声明的变量

    //shopBuyItem：购买指定商品，to参数为商品编号
    remote.fetch({func:"shop.BuyItem", "to": !!idx ? idx : 0}, msg => {
        remote.isSuccess(msg);

        remote.expect(msg.data).to.not.be.empty;
        remote.expect(msg.data.order_id).to.not.be.empty; //订单号
        remote.expect(msg.data.notify_url).to.not.be.empty; //服务端回调地址
        remote.expect(msg.data.plat_user_id).to.not.be.empty; //用户UUID
        tradeNo = msg.data.order_id; //记录订单号，方便后面做校验

        //客户端使用前述流程获取的参数，向360发起支付流程，此处略过。。。

        //模拟360回调我方服务端的流程：此举导致服务端下行notify，从而完成整个case
        let params = {
            game_key: remote.config["360"].game_key,
            plat_user_id: msg.data.plat_user_id,
            order_id: msg.data.order_id,
            amount: msg.data.amount,
            plat_order_id: msg.data.order_id
        };
        params.sign = sign(params, remote.config["360"].game_secret);
        let url = `${msg.data.notify_url}`;
        remote.fetch({
            game_key: params.game_key,
            plat_user_id: params.plat_user_id,
            order_id: params.order_id,
            amount: params.amount,
            plat_order_id: params.plat_order_id,
            sign: params.sign
        }, msg => {
            remote.expect(msg).to.be.equal("ok");    //操作成功
            cb(msg);
        }, url);
    });
}

exports = module.exports = {
    purchaseOf360: purchaseOf360,   //360购物流程
};
