let facade = require('../../Facade')
let {ReturnCode, EntityType, PurchaseStatus} = facade.const

/**
 * 路由消息控制器
 * Updated by liub on 2017-05-05.
 */
class remote extends facade.Control
{
    /**
     * 中间件设定
     */
    get middleware(){
        return ['parseParams', 'commonHandle'];
    }
    
    /**
     * 路由的社交消息
     * @param obj
     * @returns {number}
     */
    async userNotify(obj){
        /**
         * @type {UserEntity}
         */
        let ui = this.core.GetObject(EntityType.User, `${obj.domain}.${obj.openid}`, IndexType.Domain);
        if(!!ui){
            ui.socialNotify(obj.msg);
        }
        return {code: ReturnCode.Success};
    }

    /**
     * 索引服通知预注册
     * @param svr
     * @param obj
     */
    userPreLogin(svr, obj){
        return this.core.entities.UserEntity.preLogin(obj.msg);
    }

    /**
     * 索引服查询统计信息
     * @param svr
     * @param obj
     * @returns {{code: number, data: {totalUser: Number, totalOnline: Number}}}
     */
    summary(svr, obj){
        return {
            code:ReturnCode.Success, 
            data:{
                totalUser:this.core.numOfTotal, 
                totalOnline: this.core.numOfOnline, 
                totalAmount: this.core.GetMapping(EntityType.BuyLog).summary('total_fee', cur=>{return cur.result == PurchaseStatus.commit}),
            }
        };
    }

    /**
     * 由Index中转的控制台命令
     * @param {*} svr 
     * @param {*} obj 
     */
    rpc(svr, obj){
        return this.core.control.Console["command"](null, {data: obj.msg});
    }
}

exports = module.exports = remote;
