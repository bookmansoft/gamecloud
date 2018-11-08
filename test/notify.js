/**
 * 单元测试：消息推送
 * Creted by liub 2017.5.15
 */
let remote = require('../facade/util/clientComm')();

//一组单元测试，可使用 skip only 修饰
describe('推送', function() {
    it('服务端推送消息测试'/*单元测试的标题*/, /*单元测试的函数体，书写测试流程*/done =>{
        if(remote.rpcMode == "socket"){
            remote.auth(null, msg => {
                //remote.isSuccess(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
                let first = true;
                remote.watch(msg=>{
                    console.log(msg);
                    if(!!first){
                        first = false;
                        done();
                    }
                }, remote.const.NotifyType.none).fetch({func:"test.notify", msg:"hello"});
            });
        }
        else{
            done();
        }
    });
});
