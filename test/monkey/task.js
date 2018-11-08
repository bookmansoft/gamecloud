let remote = require('../../facade/util/clientComm')();

describe('任务管理', function() {
    it('查询任务列表', done => {
        remote.auth({openid:"2222",directly:true}, msg=>{
            remote.isSuccess(msg);

            remote.fetch({url:"q?act=101000&oper=0"}, function(msg){
                console.log(msg);
                for(let val of Object.values(msg.data.items)){
                    console.log(JSON.stringify(val));
                }
                done();
            });
        });
    });

    it('领取任务奖励', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);

            remote.fetch({url:"q?act=101001&id=1&oper=0"}, function(msg){
                remote.isSuccess(msg);
                for(let val of Object.values(msg.data.items)){
                    console.log(JSON.stringify(val));
                }
                console.log(data.bonus);
                done();
            });
        });
    });

    it('强制完成任务并领取奖励', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);

            remote.fetch({url:"q?act=101001&id=1&oper=1"}, function(msg){
                remote.isSuccess(msg);
                for(let val of Object.values(msg.data.items)){
                    console.log(JSON.stringify(val));
                }
                console.log(data.bonus);
                done();
            });
        });
    });
});
