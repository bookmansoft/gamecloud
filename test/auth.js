/**
 * 单元测试：注册登录
 * Creted by liub 2017.3.24
 */
let {ReturnCodeName, CommMode, ReturnCode, NotifyType, UserStatus} = require('../facade/define/comm'); //常量
let remote = require('../facade/util/clientComm')();

describe('认证', function() {
    /**
     * 一个单元测试，可使用 skip only 修饰
     * 和负载均衡相关的单元测试，首先连接9901端口，发送config.getServerInfo请求，携带 "stype":"IOS", "oemInfo":{"openid":'helloworl'} 等参数，返回值：data.newbie:是否新注册用户 data.ip:服务器IP, data.port:服务器端口号
     */
    it.only('注册并登录 - 自动负载均衡'/*单元测试的标题*/, /*单元测试的函数体，书写测试流程*/done =>{
        let first = true;
        remote.auth({openid: `${Math.random()*1000000000 | 0}`}, msg => {
            remote.isSuccess(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
            done();
        });
    });

    it('路由基准测试', done=>{
        remote.auth({}).fetch({}, msg=>{
            console.log(msg);
            done();
        }, `test/ping.html`);
    });

    it.skip('登录 - 自动推送好友列表', done =>{
        let first = true;
        remote.watch(msg=>{
            msg.map(item=>{
                remote.log(item);
            });
            if(first){
                first = false;
                done();
            }
        }, NotifyType.friends).auth({}, msg => {
            remote.isSuccess(msg,true);
        });
    });

    /**
     * NotifyType.action会在登录时或者冲关体力不足时自动下发,也可以调用 gate.checkAction 主动查询
     */
    it('登录 - 自动推送体力值', done =>{
        let first = true;
        remote.watch(msg=>{
            //服务端下发当前体力、体力上限、下一点体力恢复时间戳
            remote.log(msg);
            if(first){
                first = false;
                done();
            }
        }, NotifyType.action)
        .auth({}, msg => {
            remote.isSuccess(msg,true);
            console.log(`用户昵称:${decodeURIComponent(msg.data.name)}`); //中文解码
        });
    });
});
