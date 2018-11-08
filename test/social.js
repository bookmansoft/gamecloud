/**
 * 单元测试：互动操作
 * Creted by liub 2017.3.24
 *
 * only skip before after beforeEach afterEach
 */
let remote = require('./../facade/util/clientComm')();
let Indicator = require('../facade/util/Indicator'); //标志位管理
let {UserStatus, ActionExecuteType, NotifyType, ReturnCode} = require('../facade/define/comm');

describe('互动', function() {
    beforeEach(()=>{
        remote = remote.newone;
    });

    it('奴隶系统 - 跨服调用', done=>{
        remote.auth().fetch({func:'test.remote', openid:'727256290'}, msg=>{
            remote.log(msg);
            done();
        });
    });

    it('奴隶系统 - 抓捕、主动提前释放', done =>{
        let first = true;
        let recy = 1;
        let rs = [remote.newone, remote.newone];
        
        //模拟两个客户端同时登录
        Promise.all([
            new Promise(resolve=>{rs[0].auth({openid: "777.492"}, ()=>{resolve();});}),
            new Promise(resolve=>{rs[1].auth({openid: "777.493"}, ()=>{resolve();});}),
        ]).then(ret=>{
            rs[1].watch(msg=>{
                if(msg.early == 1){
                    console.log('提前释放');
                }
                if(first){
                    first = false;
                    done();
                }
            }, NotifyType.slaveRelease).watch(msg=>{
                remote.log(msg);
                done();
            }, remote.const.NotifyType.chat).watch(msg=>{
                //监听抓捕消息
                rs[1].log(`你(${msg.dst})被${msg.src}抓捕为奴隶`);
            }, NotifyType.slaveCatched);

            rs[0].watch(msg=>{
                remote.log(msg);
                done();
            }, remote.const.NotifyType.chat).watch(msg=>{
                //监听奴隶列表信息
                console.log('奴隶列表', msg);
                rs[0].fetch({func:'sendHello', actionType: NotifyType.slaveRelease, openid: rs[1].userInfo.openid});
            }, NotifyType.slaveList).watch(msg=>{
                console.log(
                    '好友状态改变, UserStatus.slave:', 
                    recy++, 
                    Indicator.inst(msg.value).check(UserStatus.slave)
                );

                rs[0].fetch({func: "9002"}, msg => {
                    rs[0].isSuccess(msg);
                    msg.data.list.map(item=>{
                        if(item.openid == '777.493'){
                            console.log(item);
                        }
                    });
                })
            }, NotifyType.userStatus).watch(msg=>{
                if(msg.code == ReturnCode.Success){
                    rs[0].fetch({func:'social.getSlaveList'});
                }
                else{
                    console.log(msg);
                }
            },NotifyType.slaveCatched).watch(msg=>{
                rs[0].isSuccess(msg);
                //收到战斗指令，分析下行携带的关卡号、敌人ID, 发送开始战斗、结束战斗操作
                let $gid = msg.gid;

                //开始抓捕战斗，上行关卡号、敌人ID
                rs[0].fetch({func:'gate.startCatch', id:$gid}, msg=>{
                    rs[0].isSuccess(msg);
                    rs[0].fetch({func:'gate.catch', id:$gid, blood:10000});//提交战报，将引发奴隶抓捕类推送消息（攻守双方）
                });
            },NotifyType.slaveCatch).fetch({func:'sendHello', actionType:NotifyType.slaveCatch, openid: rs[1].userInfo.openid});
        }).catch(e=>{});
    });

    it('好友列表', done=>{
        remote.auth({directly:true, openid:'777.492'}).fetch({func:'login.getFriendList'}, msg=>{
            msg.data.list.map(item=>{
                console.log(item.openid, 'slave', Indicator.inst(item.status).check(UserStatus.slave));
            });
            done();
        });
    });
    
    /**
     * 新增：奴隶系统
     */
    it('奴隶系统 - 抓捕、起义', done =>{
        let first = true;
        let rs = [remote.newone, remote.newone];
        
        //模拟两个客户端同时登录
        Promise.all([
            new Promise(resolve=>{rs[0].auth({openid:"555"}, ()=>{resolve();});}),
            new Promise(resolve=>{rs[1].auth({openid:"999"}, ()=>{resolve();});}),
        ]).then(ret=>{
            rs[1].watch(msg=>{
                // console.log('奴隶收到 好友状态变化', msg.id, 
                // ' master ', Indicator.inst(msg.value).check(UserStatus.master), 
                // ' slave ', Indicator.inst(msg.value).check(UserStatus.false));
            }, NotifyType.userStatus).watch(msg=>{  //己方起义引发的推送
                //console.log('奴隶收到 起义消息：', msg);
                if(first){
                    first = false;
                    done();
                }
            }, NotifyType.slaveEscaped).watch(msg=>{ //对方抓捕引发的推送
                //监听抓捕消息
                //rs[1].log(`奴隶收到 被抓捕消息：你(${msg.dst})被${msg.src}抓捕为奴隶`);

                //发送起义请求，将引发NotifyType.slaveEscape推送
                setTimeout(()=>{
                    rs[1].fetch({func:'sendHello', actionType:NotifyType.slaveEscape, openid: rs[0].userInfo.openid});
                }, 6000);
            }, NotifyType.slaveCatched).watch(msg=>{
                if(msg.code == ReturnCode.Success){
                    //收到战斗指令，分析下行携带的关卡号、敌人ID，发送开始战斗、结束战斗操作
                    let $gid = msg.gid;

                    //开始起义，上行关卡号、敌人ID
                    rs[1].fetch({func:'gate.startEscape', id:$gid}, msg=>{
                        rs[1].isSuccess(msg);
                        //提交战报，将引发
                        rs[1].fetch({func:'gate.escape', id:$gid, blood:999});
                    });
                }
                else{
                    console.log('奴隶收到 发动起义消息', msg);
                }
            }, NotifyType.slaveEscape);

            rs[0].watch(msg=>{
                console.log('主人收到 好友状态变化', msg.id,
                    ' master ', Indicator.inst(msg.value).check(UserStatus.master), 
                    ' slave ', Indicator.inst(msg.value).check(UserStatus.slave));
            }, NotifyType.userStatus).watch(msg=>{
                if(msg.code == ReturnCode.Success){ //己方提交战报引发的推送
                    //收到战斗指令，分析下行携带的关卡号、敌人ID，发送开始战斗、结束战斗操作
                    let $gid = msg.gid;

                    //开始抓捕战斗，上行关卡号、敌人ID
                    rs[0].fetch({func:'gate.startCatch', id:$gid}, msg=>{
                        rs[0].isSuccess(msg);

                        //提交战报，将引发奴隶抓捕类推送消息（攻守双方）
                        rs[0].fetch({func:'gate.catch', id:$gid, blood:1}, msg=>{
                            rs[0].isSuccess(msg);
                            setTimeout(()=>{
                                rs[0].fetch({func:'login.getFriendList'}, msg=>{
                                    console.log('主人获取奴隶列表 before');
                                    msg.data.list.map(item=>{
                                        console.log(item.openid, 'slave', Indicator.inst(item.status).check(UserStatus.slave));
                                    });
                                });
                            }, 3000);
                        });
                    });
                }
                else{
                    console.log('主人收到 发动抓捕消息', msg);
                }
            }, NotifyType.slaveCatch).watch(msg=>{
                console.log("主人收到 抓捕结果：", msg);
            }, NotifyType.slaveCatched).watch(msg=>{ //对方起义引发的推送
                console.log('主人收到 奴隶起义：', msg);
                rs[0].fetch({func:'login.getFriendList'}, msg=>{
                    console.log('主人获取奴隶列表 after');
                    msg.data.list.map(item=>{
                        console.log(item.openid, 'slave', Indicator.inst(item.status).check(UserStatus.slave));
                    });
                });
            }, NotifyType.slaveEscaped)
            .fetch({func:'sendHello', actionType:NotifyType.slaveCatch, openid: rs[1].userInfo.openid});
        }).catch(e=>{});
    });

    it('奴隶系统 - 获取奴隶列表', done=>{
        remote.watch(msg=>{
            //监听奴隶列表信息
            console.log(msg);
            done();
        }, NotifyType.slaveList).auth().fetch({func:'social.getSlaveList'});
    });

    it('奴隶系统 - 抓捕、赎身', done =>{
        let first = true;
        let recy = 1;
        let rs = [remote.newone, remote.newone];
        
        //模拟两个客户端同时登录
        Promise.all([
            new Promise(resolve=>{rs[0].auth({directly:true,openid: "777.492"}, ()=>{resolve();});}),
            new Promise(resolve=>{rs[1].auth({directly:true,openid: "777.493"}, ()=>{resolve();});}),
        ]).then(ret=>{
            rs[1].watch(msg=>{
                console.log(msg);
            }, NotifyType.slaveRansom).watch(msg=>{
                //监听抓捕消息
                rs[1].log(`你(${msg.dst})被${msg.src}抓捕为奴隶`);

                rs[1].fetch({func:'sendHello', actionType: NotifyType.slaveRansom, openid: rs[0].userInfo.openid});
            }, NotifyType.slaveCatched);

            rs[0].watch(msg=>{
                console.log(
                    '好友状态改变, UserStatus.slave:', 
                    recy++, 
                    Indicator.inst(msg.value).check(UserStatus.slave)
                );
            }, NotifyType.userStatus).watch(msg=>{
                console.log(msg);
            },NotifyType.slaveCatched).watch(msg=>{
                //收到战斗指令，分析下行携带的关卡号、敌人ID, 发送开始战斗、结束战斗操作
                let $gid = msg.gid;

                //开始抓捕战斗，上行关卡号、敌人ID
                rs[0].fetch({func:'gate.startCatch', id:$gid}, msg=>{
                    rs[0].isSuccess(msg);
                    rs[0].fetch({func:'gate.catch', id:$gid, blood:10000});//提交战报，将引发奴隶抓捕类推送消息（攻守双方）
                });
            },NotifyType.slaveCatch).watch(msg=>{ 
                console.log('释放：', msg);

                if(first){
                    first = false;
                    //结束整个测试用例
                    done();
                }
            }, NotifyType.slaveRansom).fetch({func:'sendHello', actionType:NotifyType.slaveCatch, openid: rs[1].userInfo.openid});
        }).catch(e=>{});
    });
    
    //购买额外次数, 每次购买成功，都会引发额外的
    it('奴隶系统 - 购买额外的行为次数', done=>{
        remote.auth({directly:true}).watch(msg=>{
            console.log(msg);
            setTimeout(done, 1000);
        }, NotifyType.purchase).watch(msg=>{
            console.log(msg);
        }, NotifyType.actions).fetch({
            func:'sendHello', 
            actionType: NotifyType.purchase,
            act: ActionExecuteType.AE_SlaveEscape
        });
    });

    it('奴隶系统 - 奴隶主和奴隶互动', done =>{
        let first = true;
        let rs = [remote.newone, remote.newone];

        //模拟两个客户端同时登录
        Promise.all([
            new Promise(resolve=>{rs[0].auth({directly:true,openid:"777.492"}, ()=>{resolve();});}),
            new Promise(resolve=>{rs[1].auth({directly:true,openid: "777.493"}, ()=>{resolve();});}),
        ]).then(ret=>{
            rs[1]
            .watch(msg=>{ //监听抓捕消息
                rs[1].log(`你(${msg.dst})被${msg.src}抓捕为奴隶`);

                rs[1].fetch({func:"1003", id:4021, num:5})
                .fetch({func:"1003", id:4022, num:5})
                .fetch({func:"1003", id:4023, num:5}, msg => { 
                    //报复
                    // rs[1].fetch({func:'sendHello', actionType:NotifyType.slaveAvenge, openid: rs[0].userInfo.openid});
                    //谄媚
                    rs[1].fetch({func:'sendHello', actionType:NotifyType.slaveFlattery, openid: rs[0].userInfo.openid});
                })
            }, NotifyType.slaveCatched)
            .watch(msg=>{rs[1].log(`slave ${msg.src}鞭挞了你(${msg.dst})`);}, NotifyType.slaveLash)
            .watch(msg=>{rs[1].log(`slave ${msg.src}给你喂食(${msg.dst})`);}, NotifyType.slaveFood)
            .watch(msg=>{rs[1].log(`slave ${msg.src}表扬了你(${msg.dst})`);}, NotifyType.slaveCommend)
            .watch(msg=>{console.log('slave 报复', msg);}, NotifyType.slaveAvenge)
            .watch(msg=>{rs[1].log(msg);}, NotifyType.slaveFlattery)

            rs[0]
            .watch(msg=>{console.log('master lash', msg);}, NotifyType.slaveLash)
            .watch(msg=>{console.log('master food', msg);}, NotifyType.slaveFood)
            .watch(msg=>{console.log('master commend', msg);}, NotifyType.slaveCommend)
            .watch(msg=>{console.log(`master 报复${msg.src}`);}, NotifyType.slaveAvenge)
            .watch(msg=>{console.log(msg);}, NotifyType.slaveFlattery)
            .watch(msg=>{
                if(msg.code == ReturnCode.Success){
                    rs[0].fetch({func:'sendHello', actionType:NotifyType.slaveLash, openid: rs[1].userInfo.openid});
                    //rs[0].fetch({func:'sendHello', actionType:NotifyType.slaveFood, openid: rs[1].userInfo.openid});
                    //rs[0].fetch({func:'sendHello', actionType:NotifyType.slaveCommend, openid: rs[1].userInfo.openid});
                }
            }, NotifyType.slaveCatched)
            .watch(msg=>{
                if(msg.code == ReturnCode.Success){
                    let $gid = msg.gid;
                    //开始抓捕战斗，上行关卡号、敌人ID
                    rs[0].fetch({func:'gate.startCatch', id:$gid}, msg=>{
                        rs[0].isSuccess(msg);
                        rs[0].fetch({func:'gate.catch', id:$gid, blood:999});//提交战报，将引发奴隶抓捕类推送消息（攻守双方）
                    });
                }
                else{
                    console.log('error', msg);
                }
            }, NotifyType.slaveCatch)
            //.fetch({func:"1003", id:4021, num:5})
            //.fetch({func:"1003", id:4022, num:5})
            //.fetch({func:"1003", id:4023, num:5})
            .fetch({func:'sendHello', actionType:NotifyType.slaveCatch, openid: rs[1].userInfo.openid});

            setTimeout(done, 5000);

        }).catch(e=>{});
    });

    it('路由消息', done =>{
        let first = true;
        let rs = [remote.newone, remote.newone];
        Promise.all([
            new Promise(resolve=>{rs[0].auth({directly:true,domain:'tx.IOS', openid: "777.493"}, ()=>{resolve();});}),
            new Promise(resolve=>{rs[1].auth({directly:true,domain:'tx.IOS', openid: "55446.336"}, ()=>{resolve();});}),
        ]).then(ret=>{//两个客户端都已经成功登录
            //客户端2开始监听服务端推送的消息
            rs[1].watch(msg=>{
                rs[1].log(msg);
                if(first){
                    first = false;
                    done();
                }
            }, NotifyType.socialSendAction);
            //客户端1发送互动操作，引发逻辑服1对客户端2推送消息，该消息经由索引服中转至客户端2所在的逻辑服2后，下发给客户端2
            rs[0].fetch({func:'sendHello', actionType:NotifyType.socialSendAction, openid: rs[1].userInfo.openid});
        }).catch(e=>{});
    });

    it('登记缺乏体力分享，获取体力，返回成功应答 - 1010', done => {
        let first = true;
        remote.watch(msg=>{
            remote.log(msg);
            if(first){
                first = false;
                setTimeout(done, 2000);
            }
        }, NotifyType.actions).auth({directly:true, openid:"A98E.11"}).fetch({func:"1010", type:ActionExecuteType.AE_SocialOfAction}, msg => {
            remote.log(msg);
        });
    });

    it('登记战败分享，获取复活道具，返回成功应答 - 1010', done => {
        let first = true;
        remote.watch(msg=>{
            remote.log(msg);
            if(first){
                first = false;
                setTimeout(done, 2000);
            }
        }, NotifyType.actions).auth({directly:true, openid:"A98E.11"}).fetch({func:"1010", type:ActionExecuteType.AE_SocialOfFail}, msg => {
            remote.log(msg);
        });
    });

    it('用户B点赞，用户A收到互动消息、收取奖励', done =>{
        let first = true;
        let rs = [remote.newone, remote.newone];
        Promise.all([
            new Promise(resolve=>{rs[0].auth({directly:true, domain:'tx.IOS', openid: "777.492"}, ()=>{resolve(rs[0].userInfo.openid);});}),
            new Promise(resolve=>{rs[1].auth({directly:true, domain:'tx.IOS', openid: "777.493"}, ()=>{resolve(rs[1].userInfo.openid);});}),
        ]).then(ret=>{
            rs[0].watch(msg=>{
                console.log('recy', msg);

                //用户点击收取奖励
                rs[0].fetch({func:'bonusHello', openid: rs[1].userInfo.openid}, msg=>{
                    console.log('bonus', msg);
                    done();
                });
            }, NotifyType.socialSendHello);

            rs[1].fetch({func:'sendHello', actionType: NotifyType.socialSendHello, openid: rs[0].userInfo.openid}, msg=>{
                console.log('send', msg);
            });
        }).catch(e=>{});
    });

    it('用户A上线，然后B上线，A收到用户B上线、下线、开始游戏、结束游戏等消息', done =>{
        let first = true;
        let rs = [remote.newone, remote.newone];
        Promise.all([
            new Promise(resolve=>{rs[0].auth({domain:'tx.IOS', openid: "777.492"}, ()=>{resolve(rs[0].userInfo.openid);});}),
            new Promise(resolve=>{rs[1].auth({domain:'tx.IOS', openid: "777.495"}, ()=>{resolve(rs[1].userInfo.openid);});}),
        ]).then(ret=>{
            rs[0].watch(msg=>{console.log('friend status', msg);}, NotifyType.userStatus);
            //二次登录，造成下线、上线消息群发
            rs[1].auth().fetch({func:'gate.start', id:1}, msg=>{//开始游戏
                rs[1].isSuccess(msg);
                if(first){
                    first = false;
                    setTimeout(done, 3000);
                }
            });
        }).catch(e=>{});
    });

    it('使用复活道具 - 1002', function(done) {
        remote.auth().fetch({func:"1002", id:20, num:1}, function(msg){
            remote.log(msg);
            done();
        });
    });

    it('使用首次分享 - 1010', function(done) {
        remote.auth({directly:true}).fetch({func:"1010"}, msg => {
            remote.log(msg);
            done();
        });
    });
});
