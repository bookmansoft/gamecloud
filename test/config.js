/**
 * 单元测试：获取配置文件
 * Creted by liub 2017.3.24
 *
 * @note 由于JSON中不便放置注释，关于配置文件，需要策划提供额外的字段说明文档
 */
let remote = require('../facade/util/clientComm')();

describe('配置文件', function() {
    it('获取商品列表 shopdata', function(done) {
        remote.fetch({func:"config.get", "file":"shopdata"}, function(msg){
            remote.expect(msg.code).to.be.equal(remote.const.ReturnCode.Success);    //返回值
            done();
        }, false);
    });
    it('获取每日登录奖励 DataDayLoginAward', function(done) {
        remote.fetch({func:"config.get", "file":"DataDayLoginAward"}, function(msg){
            remote.expect(msg.code).to.be.equal(remote.const.ReturnCode.Success);
            done();
        });
    });
    it('获取常量表 DataConst', function(done) {
        remote.fetch({func:"config.get", "file":"DataConst"}, function(msg){
            remote.expect(msg.code).to.be.equal(remote.const.ReturnCode.Success);
            done();
        });
    });
});
