/**
 * 单元测试：注册登录、简单应答、推送
 * Creted by liub 2017.3.24
 */

const remote = require('./util')

//一组单元测试流程
describe('认证', function() {
    /**
     * 一个单元测试流程，可使用 .skip .only 修饰
     * 和负载均衡相关的单元测试，首先连接9901端口，发送config.getServerInfo请求，携带 "stype":"IOS", "oemInfo":{"openid":'helloworl'} 等参数，返回值：data.newbie:是否新注册用户 data.ip:服务器IP, data.port:服务器端口号
     */
    it(
        '注册并登录 - 自动负载均衡', /*单元测试的标题*/
        async () => { /*单元测试的函数体，书写测试流程*/
            let msg = await remote.login({domain: 'tx.IOS', openid: `${Math.random()*1000000000 | 0}`});

            if(remote.isSuccess(msg)) {
                try {
                    msg = await remote.fetching({func: "2001"});
                    remote.isSuccess(msg, true);
                }
                catch(e) {
                    console.error(e);
                }
            }
        });
});
