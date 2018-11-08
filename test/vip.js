/**
 * Created by liub on 2017-07-03.
 * VIP管理，包括检查VIP有效期、领取VIP奖励、购买以延长VIP有效期
 * @note
 *      1、取消了游戏内商城购买VIP功能(1003协议)，改为直接通过玩吧积分兑换VIP特权（1006协议）
 */
let remote = require('../facade/util/clientComm')();
let {purchaseOfTx} = require('./sdk_qqgame');
let {UserStatus} = require('../facade/define/comm');

describe('VIP', function() {
    it('领取每日奖励，分为VIP和普通奖励两种', done=>{
        remote.auth({directly:true}).fetch({func:"vip.draw"}, ret=>{
            remote.log(ret);
            done();
        });
    });

    it('检查VIP有效期', done=>{
        remote.auth().fetch({func:"vip.checkValid"}, ret=>{
            remote.isSuccess(ret, true);
            done();
        });
    });

    it('购买并使用VIP卡,以延长VIP有效期', done=>{
        remote.watch(msg=>{
            console.log(msg);
        }, UserStatus.actions).auth({}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({func:"shop.BuyItem", "itemid": 13161}, msg =>{
                //remote.log(msg);
                remote.fetch({func:"vip.checkValid"}, ret=>{//检查VIP有效期
                    remote.isSuccess(ret);
                    done();
                });
            });
        });
    });
});
