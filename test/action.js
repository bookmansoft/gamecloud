/**
 * 单元测试：内政相关
 * Creted by liub 2017.3.25
 */
let {CommMode} = require('../facade/define/comm');
let remote = require('../facade/util/clientComm')();

//一组单元测试，可使用 skip only 修饰
describe('内政', function() {
    it('上报积分和金币 - 1001', function(done) {
        remote.auth(null, msg => {
            remote.isSuccess(msg, true);
            remote.fetch({func: "9001"}, msg => {
                remote.isSuccess(msg);
                msg.data.list.map(item => {
                    remote.log(item);
                });
                remote.log(msg.data.rank);

                remote.fetch({func: "1001", start: 0, score: 103, money: 1}, msg => {
                    remote.isSuccess(msg, true); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
                    remote.fetch({func: "1001", start: 1, score: 1, money: 0}, msg => {
                        remote.isSuccess(msg, true); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
                        remote.fetch({func: "9001"}, msg => {
                            msg.data.list.map(item => {
                                remote.log(item);
                            });
                            remote.log(msg.data.rank);

                            remote.fetch({func: "1001", start: 1, score: 353, money: 0}, msg => {
                                remote.isSuccess(msg, true); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
                                remote.fetch({func: "9001"}, msg => {
                                    msg.data.list.map(item => {
                                        remote.log(item);
                                    });
                                    remote.log(msg.data.rank);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    //直连服务端，已有用户可以成功，新注册用户由于绕过了Index而导致失败，可注释directly以确保成功
    it('直连服务端', done =>{
        remote.auth({openid:"12345677", directly:true}, msg => {
            remote.isSuccess(msg);
            done();
        });
    });

    it('异常流程测试', done => {
        remote.auth({openid:"8ssa008d"}, msg => {
            remote.isSuccess(msg, true);
            remote.fetch({func: "1001", start: 0, score: 1, money: 1}, msg => {
                remote.isSuccess(msg, true); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
                remote.auth({openid:"8ssa008d"}, msg => {
                    remote.isSuccess(msg, true);
                    remote.fetch({func: "9001"}, msg => {
                        msg.data.list.map(item => {
                            remote.log(item);
                        });
                        remote.log(msg.data.rank);
                        done();
                    });
                });
            });
        });
    });

    it('获取加持效果', function(done) {
        remote.auth().fetch({func: "getEffect"}, msg => {
            remote.isSuccess(msg, true); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
            done();
        });
    });

    it('获取每日榜信息 - 9001', function(done) {
        remote.auth().fetch({func: "9001"}, msg => {
            remote.isSuccess(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
            msg.data.list.map(item=>{
                item.name = decodeURIComponent(item.name);
                remote.log(item);
            });
            done();
        });
    });

    it('获取总榜信息 - 9000', done => {
        remote.auth({directly:true}).fetch({control:'rank', func: "9000"}, msg => {
            remote.isSuccess(msg, true);
            msg.data.list.map(item=>{
                item.name = decodeURIComponent(item.name);
                console.log(item);
            });
            console.log(msg.data.rank);
            done();
        });
    });

    it('新用户登录，获取总榜和日榜，然后参加一场比赛，再重新获取总榜和日榜', function(done) {
        remote.auth(null, msg => {
            remote.fetch({func: "9000"}, msg => {
                msg.data.list.map(item=>{
                    remote.log(item);
                });
                remote.log(msg.data.rank);
                remote.fetch({func: "9001"}, msg => {
                    msg.data.list.map(item=>{
                        remote.log(item);
                    });
                    remote.log(msg.data.rank);
                    done();
                })
            })
        });
    });

    it('获取总榜信息 - 9000', function(done) {
        let rate = 1000;
        Promise.all(["555", "666", "777", "888", "999", "111", "9699"].map(cur=>{
                return new Promise(resolve=>{
                    let obj = remote.newone;
                    obj.auth({openid:cur}).fetch({func: "1001", start:0}, msg => {
                        setTimeout(()=>{
                            obj.fetch({func: "1001", start:1, score:Math.floor(Math.random()*rate), money:Math.floor(Math.random()*5)}, msg => {
                                resolve();
                            });
                        }, 100);
                    });
                });
            })
        ).then(retList=>{
            remote.auth(null, msg => {
                remote.fetch({func: "9000"}, msg => {
                    msg.data.list.map(item=>{
                        remote.log(item);
                    });
                    remote.log(msg.data.rank);
                    done();
                })
            });
        });
    });

    //start: 0 开始 1 结束，服务端利用时长判断数值合法性，最长3600 每秒3分、1.5金币
    it('上报积分和金币 - 1001', function(done) {
        remote.auth(null, msg=>{
            remote.isSuccess(msg, true);
            remote.fetch({func: "1001", start:0}, msg => {
                remote.isSuccess(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
                remote.fetch({func: "1001", start:1, score:5, money:100}, msg => {
                    remote.isSuccess(msg, true); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
                    done();
                });
            });
        });
    });

    it('获取好友榜 - 9002', function(done) {
        let uuid = '777.493';
        remote.auth({openid:uuid}, msg => {
            remote.fetch({func: "9002"}, msg => {
                remote.isSuccess(msg);
                msg.data.list.map(item=>{
                    if(item.openid == '777.492' || item.openid == '777.493'){
                        console.log(item);
                    }
                    if(item.openid == uuid){
                        console.log("自己在列表中");
                    }
                });
                done();
            })
        });
    });

    it('修改路、场景、角色 - 1009', function(done) {
        remote.auth().fetch({func: "1009", id:18}, msg => {
            remote.log(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
            done();
        })
    });
    it('新手引导 - checkGuide', function(done) {
        remote.auth({openid:"7777"}).fetch({func: "checkGuide"}, msg => {
            remote.log(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
            done();
        })
    });
    it('新用户礼包 - getGift', function(done) {
        remote.auth({openid:"baaaaabbb"}).fetch({func: "getGift",type:"6"}, msg => {
            remote.log(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
            done();
        })
    });
    it('获取当前时间戳- getTime', function(done) {
        remote.auth({openid:"baaaaabbb"}).fetch({func: "getTime"}, msg => {
            remote.log(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
            done();
        })
    });
});
