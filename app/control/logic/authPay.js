let facade = require('../../../facade/Facade')
/**
 * Created by liub on 2017-04-06.
 */

let {DomainType, ReturnCode} = facade.const
let {now, ms, sign} = facade.util

/**
 * 第三方认证支付接口
 */
class authPay extends facade.Control
{
    /**
     * 控制器自带的Url路由信息
     */
    get router(){
        return [
            ['/auth360.html', 'auth360'],         //模拟 360 网关下发签名集
            ['/pay360.html', 'pay360'],           //360 发货回调路由
            ['/txpay.html', 'txpay'],             //腾讯发货回调接口
            ['/authAdmin.html', 'authAdmin'],     //管理后台登录验证页面
            ['/test/ping.html', 'ping'],          //PING测试接口
        ];
    }

    /**
     * for test only: 用于为测试环境下的直连模式生产验证信息
     * @param {*} objData 
     */
    async auth360(objData){
        let ret = {
            t: now(),             //当前时间戳，游戏方必须验证时间戳，暂定有效 期为当前时间前后 5 分钟
            nonce: Math.random()*1000 | 0,              //随机数
            plat_user_id: objData.id,                       //平台用户 ID
            nickname: objData.id,                           //用户昵称
            avatar: objData.id,                             //头像
            is_tourist: 1,                              //是否为游客
        };
        ret.sign = sign(ret, this.parent.options[DomainType.D360].game_secret);
        return ret;
    }

    /**
     * TX发货回调，属于腾讯支付流程中的第 7 步
     *
     * @note    参数名称        类型	    描述
     *          openid	        string	与APP通信的用户key，跳转到应用首页后，URL后会带该参数。由平台直接传给应用，应用原样传给平台即可。根据APPID以及QQ号码生成，即不同的appid下，同一个QQ号生成的OpenID是不一样的。
     *          appid	        string	应用的唯一ID。可以通过appid查找APP基本信息。
     *          ts	            string	linux时间戳。注意开发者的机器时间与腾讯计费开放平台的时间相差不能超过15分钟。 ？10位还是13位？先按10位处理
     *          payitem	        string	物品信息。
     *                                  （1）接收标准格式为ID*price*num，回传时ID为必传项。批量购买套餐物品则用“;”分隔，字符串中不能包含"|"特殊字符。
     *                                  （2）ID表示物品ID，price表示单价（以Q点为单位，单价最少不能少于2Q点，1Q币=10Q点。单价的制定需遵循道具定价规范），num表示最终的购买数量。
     *                                  示例：批量购买套餐，套餐中包含物品1和物品2。物品1的ID为G001，该物品的单价为10Q点，购买数量为1；物品2的ID为G008，该物品的单价为8Q点，购买数量为2，则payitem为：G001*10*1;G008*8*2 。
     *          token	        string	应用调用v3/pay/buy_goods接口成功返回的交易token。注意，交易token的有效期为15分钟，必须在获取到token后的15分钟内传递该token，否则将会返回token不存在的错误。
     *          billno	        string	支付流水号（64个字符长度。该字段和openid合起来是唯一的）。
     *          version	        string	协议版本号，由于基于V3版OpenAPI，这里一定返回“v3”。
     *          zoneid	        string	在支付营销分区配置说明页面，配置的分区ID即为这里的“zoneid”。如果应用不分区，则为0。回调发货的时候，根据这里填写的zoneid实现分区发货。注：2013年后接入的寄售应用，此参数将作为分区发货的重要参数，如果因为参数传错或为空造成的收入损失，由开发商自行承担。
     *          providetype	    string	发货类型，这里请传入0。0表示道具购买，1表示营销活动中的道具赠送，2表示交叉营销任务集市中的奖励发放。
     *          amt	            string	Q点/Q币消耗金额或财付通游戏子账户的扣款金额。可以为空，若传递空值或不传本参数则表示未使用Q点/Q币/财付通游戏子账户。允许游戏币、Q点、抵扣券三者混合支付，或只有其中某一种进行支付的情况。
     *                                  用户购买道具时，系统会优先扣除用户账户上的游戏币，游戏币余额不足时，使用Q点支付，Q点不足时使用Q币/财付通游戏子账户。这里的amt的值将纳入结算，参与分成。
     *                                  注意，这里以0.1Q点为单位。即如果总金额为18Q点，则这里显示的数字是180。请开发者关注，特别是对账的时候注意单位的转换。
     *          payamt_coins	string	扣取的游戏币总数，单位为Q点。可以为空，若传递空值或不传本参数则表示未使用游戏币。允许游戏币、Q点、抵扣券三者混合支付，或只有其中某一种进行支付的情况。
     *                                  用户购买道具时，系统会优先扣除用户账户上的游戏币，游戏币余额不足时，使用Q点支付，Q点不足时使用Q币/财付通游戏子账户。游戏币由平台赠送或由好友打赏，平台赠送的游戏币不纳入结算，即不参与分成；
     *                                  好友打赏的游戏币按消耗量参与结算（详见：货币体系与支付场景）。
     *          pubacct_payamt_coins
     *                          string	扣取的抵用券总金额，单位为Q点。可以为空，若传递空值或不传本参数则表示未使用抵扣券。允许游戏币、Q点、抵扣券三者混合支付，或只有其中某一种进行支付的情况。用户购买道具时，可以选择使用抵扣券进行一部分的抵扣，剩余部分使用游戏币/Q点。
     *                                  平台默认所有上线支付的应用均支持抵扣券。自2012年7月1日起，金券银券消耗将和Q点消耗一起纳入收益计算（详见：货币体系与支付场景）。
     *          sig	            string	请求串的签名，由需要签名的参数生成。
     *                                  （1）签名方法请见文档：腾讯开放平台第三方应用签名参数sig的说明。
     *                                  （2）按照上述文档进行签名生成时，需注意回调协议里多加了一个步骤：在构造源串的第3步“将排序后的参数(key=value)用&拼接起来，并进行URL编码”之前，需对value先进行一次编码 （编码规则为：除了 0~9 a~z A~Z !*() 之外其他字符按其ASCII码的十六进制加%进行表示，例如“-”编码为“%2D”）。
     *                                  （3）以每笔交易接收到的参数为准，接收到的所有参数除sig以外都要参与签名。为方便平台后续对协议进行扩展，请不要将参与签名的参数写死。
     *                                  （4）所有参数都是string型，进行签名时必须使用原始接收到的string型值。 开发商出于本地记账等目的，对接收到的某些参数值先转为数值型再转为string型，导致字符串部分被截断，从而导致签名出错。如果要进行本地记账等逻辑，建议用另外的变量来保存转换后的数值。
     */
    async txpay(req){
        let data = {
            amt:                    req.amt,
            appid:                  req.appid,
            billno:                 req.billno,
            openid:                 req.openid,
            payamt_coins:           req.payamt_coins,
            payitem:                req.payitem,
            ts:                     req.ts,
            providetype:            req.providetype,
            pubacct_payamt_coins:   req.pubacct_payamt_coins,
            token:                  req.token,
            version:                req.version,
            zoneid:                 req.zoneid,
        };

        if(!this.parent.service.txApi.checkPayCallbackSign(data, "/txpay.html")){
            return {ret: ReturnCode.illegalData, msg:"数据非法"};
        }
        else{
            //向玩家发放商品、下行通知 tradeNo, total_fee, notify_time
            let result = this.parent.control.shop.CommitTrade(data.openid, data.billno, data.amt);
            if(result == ReturnCode.Success){
                return {ret: result, msg:"OK"};
            }
            else{
                return {ret: result, msg:"Error"};
            }
        }
    }
    
    async pay360(req){
        let params = {
            game_key: this.parent.options[DomainType.D360].game_key, //采信己方预设值
            plat_user_id: req.plat_user_id,
            order_id: req.order_id,
            amount: req.amount,
            plat_order_id: req.plat_order_id,
            sign: req.sign
        };

        if(!params.sign == sign(params, this.parent.options[DomainType.D360].game_secret)){ //签名校验错误
            return "error.auth";
        }

        if(!!params.plat_user_id){
            //向玩家发放商品、下行通知 tradeNo, total_fee, notify_time, product_name, request_count
            let result = this.parent.control.shop.CommitTrade(params.plat_user_id, params.order_id, params.amount);
            if(result == ReturnCode.Success){
                //向第三方平台返回成功应答
                return "ok";
            }
            else{
                return "exist.not.order";
            }
        }
        else{
            return "error.openid";
        }
    }

    /**
     * PING测试接口
     */
    async ping(){
        return '200';
    }
}

exports = module.exports = authPay;
