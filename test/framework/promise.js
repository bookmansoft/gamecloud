let remote = require('../../facade/util/clientComm')();

/**
 * 单元测试：Promise
 * Creted by liub 2017.4.5
 */
describe('Promise', function() {
    /**
     * 多个Promise竞争，先完成的执行回调，后续被弃用
     */
    it('Promise race 测试', done => {
        Promise.race([
            new Promise(resolve=>{
                let _rm = remote.newone;
                _rm.auth({domain:'360.IOS', openid: "777.492"}, ()=>{
                    resolve(_rm.userInfo.openid);
                });
            }),
            new Promise(resolve=>{ setTimeout(()=>{
                let _rm = remote.newone;
                _rm.auth({domain:'360.IOS', openid: "777.493"}, ()=>{
                    resolve(_rm.userInfo.openid);
                });
            }, 200) }),
        ]).then(ret=>{
            //第一个Promise先返回，第二个Promise的返回结果被丢弃
            remote.log(ret);
            done();
        }).catch(e=>{
        });
    });

    /**
     * 多个Promise并行，全部完成后执行回调
     */
    it('Promise all 测试', done => {
        Promise.all([
            new Promise(resolve=>{
                let _rm = remote.newone;
                _rm.auth({domain:'360.IOS', openid: "777.492"}, ()=>{
                    resolve(_rm.userInfo.openid);
                });
            }),
            new Promise(resolve=>{ setTimeout(()=>{
                let _rm = remote.newone;
                _rm.auth({domain:'360.IOS', openid: "777.493"}, ()=>{
                    resolve(_rm.userInfo.openid);
                });
            }, 200) }),
        ]).then(ret=>{
            //所有Promise都返回了结果
            remote.log(ret[0]);
            remote.log(ret[1]);
            done();
        }).catch(e=>{});
    });

    /**
     * 多个Promise串行，一个完成后执行下一个
     */
    it('Promise waterfull 测试', function(done){
        let rs = [remote.newone, remote.newone, remote.newone];
        let list = [
            new Promise(resolve=>{
                rs[0].auth({domain:'360.IOS', openid: "777.492"}, ()=>{
                    resolve(rs[0].userInfo.openid);
                });
            }),
            new Promise(resolve=>{ setTimeout(()=>{
                rs[1].auth({domain:'360.IOS', openid: "777.493"}, ()=>{
                    resolve(rs[1].userInfo.openid);
                });
            }, 200) }),
            new Promise(resolve=>{ setTimeout(()=>{
                rs[2].auth({domain:'360.IOS', openid: "777.494"}, ()=>{
                    resolve(rs[2].userInfo.openid);
                });
            }, 200) }),
        ];

        (async function(){
            for(let pro of list){
                let ret = await pro;
                console.log(ret);
            }
            done();
        })();
    });
});
