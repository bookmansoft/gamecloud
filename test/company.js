/**
 * 单元测试：公司经营管理
 * Creted by liub 2017.5.58
 */
let remote = require('../facade/util/clientComm')();

describe.skip('公司经营管理', function() {
    it('获取公司排行榜', done =>{
        remote.auth(null, msg => {
            remote.isSuccess(msg);
            done();
        });
    });

    it('测试排序效果', done => {
        remote.auth().fetch({func:'test.sort'}, msg=>{
            remote.isSuccess(msg, true);
            done();
        });
    });
});
