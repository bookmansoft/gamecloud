let remote = require('../../facade/util/clientComm')();

describe('时效性技能', function() {
    it('清除全部技能CD', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=503001&oper=3"}, function(msg){
                remote.isSuccess(msg);
                done();
            });
        });
    });

    it('查询时效性技能列表', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:`q?act=503001&oper=1`}, function(msg){
                remote.isSuccess(msg);
                for(let key in msg.data.items){
                    console.log(msg.data.items[key]);
                }
                Object.keys(msg.data.effects).map(key=>{
                    console.log(msg.data.effects[key]);
                });
                done();
            });
        });
    });

    it('使用指定技能', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=503001&oper=2&aid=1"}, function(msg){
                remote.isSuccess(msg);
                Object.keys(msg.data.items).map(key=>{
                    console.log(msg.data.items[key]);
                });
                Object.keys(msg.data.effects).map(key=>{
                    console.log(msg.data.effects[key]);
                });
                done();
            });
        });
    });
})