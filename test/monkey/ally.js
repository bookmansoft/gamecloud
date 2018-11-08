let remote = require('../../facade/util/clientComm')();

describe('联盟', function() {
    it('ally create', done =>{
        remote.auth({directly:true}).fetch({url:`q?act=777001&oper=3`}, msg=>{
            console.dir(msg.data);
            done();
        });
    });
});
