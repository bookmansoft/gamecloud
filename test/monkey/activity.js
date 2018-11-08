let remote = require('../../facade/util/clientComm')();

describe('活动', function() {
    it('新手引导', done =>{
        remote.auth({directly:true}).fetch({url:`q?act=103001&oper=0`}, msg=>{
            console.dir(msg.data);
            done();
        });
    });
    it('查询周活动信息', done =>{
        remote.auth({directly:true}).fetch({url:`q?act=103001&oper=1`}, msg=>{
            console.dir(msg.data);
            done();
        });
    });
    it('查询周活动排行', done =>{
        remote.auth({directly:true}).fetch({url:`q?act=103001&oper=2`}, msg=>{
            console.dir(msg.data);
            done();
        });
    });
});
