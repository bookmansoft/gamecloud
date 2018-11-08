/**
 * 单元测试：后台管理
 * Creted by liub 2017.3.24
 */
let remote = require('../facade/util/clientComm')();

describe('后台管理', function() {
    /**
     * 一个单元测试，可使用 skip only 修饰
     */
    it('登录'/*单元测试的标题*/, /*单元测试的函数体，书写测试流程*/done =>{
        remote.auth({domain:'admin', openid:'2222', openkey:'chick.server'}, msg => {
            console.log(msg);
            done(); //通知系统：测试用例顺利完成
        });
    });

    it('注册/在线/消费'/*单元测试的标题*/, /*单元测试的函数体，书写测试流程*/done =>{
        remote.auth({domain:'admin', openid:'2222', openkey:'chick.server'}, msg => {
            remote.fetch({func:'admin.summary', server:'IOS.1'}, msg=>{
                remote.log(msg);
                done();
            });
        });
    });

    it('服务器列表', done =>{
        remote.auth({domain:'admin', openid:'super', openkey:'chick.server'}, msg => {
            remote.fetch({func:'admin.getServerList'}, msg=>{
                remote.log(msg);
                done();
            });
        });
    });

    it('留存率'/*单元测试的标题*/, /*单元测试的函数体，书写测试流程*/done =>{
        remote.auth({domain:'admin', openid:'2222', openkey:'chick.server'}, msg => {
            remote.fetch({func:'admin.survive', time:'2017.5.29'}, msg=>{
                // remote.isSuccess(msg);
                // msg.data.map(it=>{
                //     remote.log(it);
                // })
                done();
            });
        });
    });

    it('列表特殊路由', done =>{
        remote.auth({domain:'admin', openid:'2222', openkey:'chick.server'}, msg => {
            remote.fetch({func:'admin.addRoute', openid:'111'}, msg=>{
                console.log(msg);
                remote.fetch({func:'admin.addRoute', openid:'222'}, msg=>{
                    console.log(msg);
                    remote.fetch({func:'admin.delRoute', openid:'111'}, msg=>{
                        console.log(msg);
                        done();
                    })
                })
            })
        });
    });
});
