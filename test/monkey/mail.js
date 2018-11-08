/**
 * 单元测试：邮箱系统
 * Creted by liub 2017.3.24
 *
 * only skip before after beforeEach afterEach
 */
let remote = require('../../facade/util/clientComm')()
let Indicator = require('../../facade/util/Indicator'); //标志位管理
let {UserStatus, ActionExecuteType, NotifyType, ReturnCode} = require('../../facade/define/comm');

describe('邮箱', function() {
    it('消息系统 - 删除消息', done =>{
        remote.auth({directly:true}).fetch({url:"q?act=600001&oper=2&idx=[1,8]"}, msg => {
            remote.isSuccess(msg);
            done();
        });
    });

    it('消息系统 - 读取消息', done =>{
        remote.auth({directly:true}).fetch({url:"q?act=600001&oper=4&idx=[19,20,21,22,23]"}, msg => {
            remote.isSuccess(msg, true);
            done();
        });
    });

    it('消息系统 - 查询消息列表', done =>{
        remote.auth({directly:true}).fetch({url:"q?act=600001&oper=3&page=1"}, msg => {
            remote.isSuccess(msg);
            console.log(`共${msg.data.total}页，第${msg.data.cur}页`);
            msg.data.list.map(item=>{
                console.log(JSON.stringify(item));
            });
            done();
        });
    });
});
