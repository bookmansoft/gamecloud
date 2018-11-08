/**
 * 单元测试：互动操作
 * Creted by liub 2017.3.24
 *
 * only skip before after beforeEach afterEach
 */
let remote = require('./../facade/util/clientComm')()
let Indicator = require('../facade/util/Indicator'); //标志位管理
let {UserStatus, ActionExecuteType, NotifyType, ReturnCode} = require('../facade/define/comm');

describe('邮箱', function() {
    beforeEach(()=>{
        remote = remote.newone;
    });

    /**
     * 新增：消息系统 - 和奴隶系统相结合
     */
    it('消息系统 - 收取消息', done =>{
        remote.watch(msg=>{
            console.log(Indicator.inst(msg).check(UserStatus.newMsg));
        }, NotifyType.status).auth({directly:true, openid:'555'}, msg => {
            remote.isSuccess(msg);

            remote.fetch({func:"mail.getList", page:1}, msg => {
                remote.isSuccess(msg);
                msg.data.map(item=>{
                    console.log(item);
                });
                done();
            });
        });
    });

    it('消息系统 - 发消息', done =>{
        remote.watch(msg=>{
            console.log(Indicator.inst(msg).check(UserStatus.newMsg));
        }, NotifyType.status).auth({directly:true, openid:'666'}, msg => {
            remote.isSuccess(msg);

            remote.fetch({func:"mail.send", openid:'666', con:'hello'}, msg => {
                remote.isSuccess(msg);
                done();
            });
        });
    });
});
