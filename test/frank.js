/**
 * Created by Administrator on 2017/5/23.
 */
/**
 * 单元测试：注册登录
 * Creted by liub 2017.3.24
 */
let remote = require('../facade/util/clientComm')();

describe('获取榜单', function() {
    it('上报积分和金币 - 1001', function(done) {
        remote.auth({directly:true}).fetch({func: "1001", start:0, score:1, money:1}, msg => {
            remote.isSuccess(msg, true); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
            remote.fetch({func: "1001", start:1, score:20, money:2}, msg => {
                remote.isSuccess(msg, true); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
                done();
            });
        });
    });

    //假定默认用户的一个好友列表，这些好友分别登录、上报得分，然后默认用户获取好友列表，预期得到一个正确排序的数组，包含domain、openid、score
    it('获取好友排行榜', function(done) {
        let flist = [
            {rm:remote.newone, openid:'666'},
            {rm:remote.newone, openid:'555'},
            {rm:remote.newone, openid:'777'},
            {rm:remote.newone, openid:'999'}
        ];
        Promise.all(
            flist.map(info=>{
                return new Promise(resolve=>{
                    info.rm.auth({openid: info.openid}, ()=>{
                        info.rm.fetch({func: "1001", start:0}, msg => {
                            info.rm.fetch({func: "1001", start:1, score: Math.ceil(Math.random()*10000+ 10000), money:1}, msg => {
                                resolve();
                            });
                        });
                    });
                })
            })
        ).then(rets=>{
            remote.auth().fetch({func: '9002'}, msg=>{
                msg.data.list.map(item=>{
                    remote.log(item);
                });
                done();
            });
        }).catch(e=>{});
    });

    it('获取公司榜', function(done) {
        remote.auth(null, msg => {
            remote.isSuccess(msg);
            remote.fetch({func: "9003"}, msg => {
                remote.isSuccess(msg,true);
                done();
            });
        })
    });
});