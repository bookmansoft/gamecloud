/**
 * 单元测试：关卡管理
 * Creted by liub 2017.5.28
 */
let {ActionExecuteType, NotifyType, ReturnCode} = require('../facade/define/comm');
let remote = require('../facade/util/clientComm')();

describe('关卡', function() {
    it('游戏关卡信息初始化 - 查询当前关卡信息', done =>{
        remote.auth().fetch({func:'gate.query'}, msg=>{
            remote.isSuccess(msg, true);    //{code:0, data:{hisGateNo:最高关卡, list:[id, star, score, state, time/*标志开始时间的时间戳*/]}}
            done();
        });
    });

    it('主动获取体力值', done =>{
        let first = true;
        remote.watch(msg=>{
            //服务端下发当前体力、体力上限、下一点体力恢复时间戳，NotifyType.action会在登录时或者冲关体力不足时自动下发,也可以调用 gate.checkAction 主动查询
            remote.log(msg);
            if(first){//会收到两条体力推送，一条是1000报文引发，一条是gate.checkAction引发
                first = false;
                done();
            }
        }, remote.const.NotifyType.action)
            .auth()
            .fetch({func:'gate.checkAction'});
    });

    it('扫荡关卡', done =>{
        remote.auth({directly:true}).fetch({func:'gate.sweep', id:1}, msg=>{
            remote.log(msg);
            remote.fetch({func:'gate.query'}, msg=>{
                remote.isSuccess(msg, true);    //{code:0, data:{hisGateNo:最高关卡, list:[id, star, score, state, time/*标志开始时间的时间戳*/]}}
                remote.fetch({func:'gate.getSweepBonus'}, msg=>{
                    remote.log(msg);
                    done();
                });
            });
        });
    });

    it('开始冲关，然后提交通关结果', done =>{
        let first = true;
        remote.watch(msg=>{//关卡每10关进行系统公告
            remote.log(msg);
            if(first){
                first = false;
                done();
            }
        }, remote.const.NotifyType.chat).auth({}, msg => {
            remote.isSuccess(msg);
            remote.fetch({func:'gate.start', id:10}, msg=>{
                //返回码：成功、体力不足
                remote.isSuccess(msg);
                setTimeout(()=>{
                    remote.fetch({func:'gate.end', id:10, score:45, blood:10, money:1, super:1}, msg=>{
                        //返回码：成功、用时太短、用时太长
                        remote.isSuccess(msg);

                        if(!!msg.data.superBonus){
                            remote.fetch({func:'1010', type:ActionExecuteType.AE_SocialOfSuper}, msg=>{
                                remote.isSuccess(msg);
                                done();
                            });
                        }
                        else{
                            done();
                        }
                    });
                }, 1000);
            });
        });
    });

    it('用户A开始冲关，用户B送体力，用户A收到互动消息，继续完成比赛、提交通关结果', done =>{
        let first = true;
        let rs = [remote.newone, remote.newone];
        Promise.all([
            new Promise(resolve=>{rs[0].auth({domain:'tx.IOS', openid: "777.492"}, ()=>{resolve(rs[0].userInfo.openid);});}),
            new Promise(resolve=>{rs[1].auth({domain:'tx.IOS', openid: "777.493"}, ()=>{resolve(rs[1].userInfo.openid);});}),
        ]).then(ret=>{
            //A用户监控互动事件，收到后立即提交通关
            rs[0].watch(msg=>{
                console.log(rs[0].const.NotifyType.socialSendAction, msg);
                rs[0].fetch({func:'gate.end'}, msg=>{
                    //返回码：成功、用时太短、用时太长
                    if(first){
                        first = false;
                        done();
                    }
                });
            }, rs[0].const.NotifyType.socialSendAction);

            //A用户开始冲关
            rs[0].fetch({func:'gate.start'}, msg=>{
                rs[0].isSuccess(msg);
                //返回码：成功、体力不足
            });

            //B用户对A用户赠送体力
            setTimeout(()=>{
                rs[1].fetch({func:'sendHello', actionType:rs[1].const.NotifyType.socialSendAction, openid: rs[0].userInfo.openid});
            }, 1000);
        }).catch(e=>{});
    });

    it('依次冲关', done =>{
        remote.auth({directly:true}, async msg => {
            remote.isSuccess(msg,true);
            for(let i = 1; i<=50; i++){
                await (new Promise(resolve=>{
                    remote.fetch({func:'gate.start', id:i}, msg=>{
                        remote.fetch({func:'gate.end', id:i, score:1, blood:1, money:1}, msg=>{
                            remote.log(msg);
                            resolve();
                        });
                    });
                }));
            }
            done();
        });
    });
});
