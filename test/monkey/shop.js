let remote = require('../../facade/util/clientComm')();
let facade = require('../../facade/Facade')
let {ResType} = facade.const;

describe('商城', function() {
    it('作弊指令', done =>{
       //使用作弊指令获取必要的资源
       remote.auth({directly:true}).fetch({url:`q?act=999003&oper=99&bonus=${ResType.Diamond},5000`}, msg=>{
           remote.isSuccess(msg);
           done();
       });
    });

    it('购买元宝', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=999003&oper=2&type=1&id=1001"}, function(msg){
                remote.isSuccess(msg,true);
                done();
            });
        });
    });

    it('购买金币', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=999003&oper=2&type=1&id=1002"}, function(msg){
                remote.isSuccess(msg,true);
                done();
            });
        });
    });

    it('购买礼包', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=999003&oper=2&type=1&id=1006"}, function(msg){
                remote.isSuccess(msg,true);
                done();
            });
        });
    });

    it('强制刷新商品列表', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=999003&oper=3&type=1"}, function(msg){
                remote.isSuccess(msg);
                msg.data.items.map(it=>{
                    console.log(it);
                });
                done();
            });
        });
    });

    it('购买礼包', done => {
        remote.auth({openid:"2222",directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=999003&oper=2&type=1&id=1001"}, function(msg){
                remote.isSuccess(msg,true);
                done();
            });
        });
    });

    it('商品列表', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=999003&oper=1&type=8"}, function(msg){
                remote.isSuccess(msg);
                msg.data.items.map(it=>{
                    console.log(it);
                });
                done();
            });
        });
    });

    it('shopInfo', done =>{
        remote.auth({directly:true}).fetch({url:`q?act=101000`}, msg=>{
            console.dir(msg.data);
            done();
        });
    });
})
