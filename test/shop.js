/**
 * 单元测试：商店
 * Creted by liub 2017.3.24
 */
let remote = require('../facade/util/clientComm')();
let {purchaseOf360} = require('./sdk_360');
let {purchaseOfTx} = require('./sdk_qqgame');

describe('商店', function() {
    it('购买内部商品 - 4012', function(done) {
        remote.auth({directly:true}).fetch({func:"1003", id:1001}, msg => {
            remote.isSuccess(msg, true);
            done();
        });
    });

    it('玩吧兑换钻石 - 1006', function(done){
        remote.auth({domain:'tx.IOS', openid:'555'}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({func:"1006", "itemid": 14070, "count": 100}, msg => {
                remote.isSuccess(msg);
                done();
            });
        });
    });

    it('使用物品', done=>{
        let first = true;
        remote.watch(msg=>{
            remote.log(msg);
        }, remote.const.NotifyType.action).auth().fetch({func: "1003", id:4011}, msg=>{
            remote.log(msg);
            remote.fetch({func:"1002", id:'22'}, msg=>{
                remote.log(msg);
                if(first){
                    first = false;
                    setTimeout(done, 1000);
                }
            });
        });
    });

    //购买并切换商品
    it('购买内部商品 - 1003', function(done) {
        remote.auth().fetch({func:"1003", id:1003, num:1}, msg =>{
            remote.fetch({func: "1009", id:1003}, msg => {
                remote.log(msg);
                remote.fetch({func: "1009", id:1001}, msg => {
                    remote.log(msg);
                    done();
                });
            });
        });
    });

    it('获取背包列表 - 2001', function(done) {
        remote.auth().fetch({func:"2001"}, msg =>{
            remote.isSuccess(msg);
            Object.keys(msg.data).map($key=>{
                remote.log(msg.data[$key]);
            });
            done();
        });
    });
});
