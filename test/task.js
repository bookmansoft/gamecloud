/**
 * 单元测试：成就系统
 * Creted by liub 2017.3.24
 */
let remote = require('../facade/util/clientComm')();
let {NotifyType} = require('../facade/define/comm');

describe('成就', function() {
    it('购买指定角色/场景，完成相关任务', done => {
        remote.watch(msg=>{//监听服务端消息推送: NotifyType.taskFinished
            remote.log(msg);
        }, remote.const.NotifyType.taskFinished).auth({directly:true}).fetch({func: "1003", id:2002}, msg => {
            remote.isSuccess(msg);

            setTimeout(()=>{done();}, 500);
        });
    });

    it('使用特定角色/场景进行游戏，完成相关任务', done => {
        remote.auth().fetch({func: "1003", id:2002}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({func:"1009", "id": 19}, msg => {
                remote.isSuccess(msg);
                remote.fetch({func: "1001", start:0}, msg => {//战斗开始
                    remote.isSuccess(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
                    remote.fetch({func: "1001", start:1, score:30, money:20}, msg => {//战斗结束，任务完成
                        remote.isSuccess(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
                        done();
                    });
                });
            });
        });
    });

    it('购买使用内部商品，完成相关任务', function(done) {
        remote.auth({domain:'tx.IOS', openid:'555'}).fetch({func:"1003", id:4001, num:1}, function(msg){
            remote.isSuccess(msg);
            remote.fetch({func:"1002", id:20, num:1}, function(msg){
                remote.isSuccess(msg);
                done();
            });
        });
    });

    it('分享，完成相关任务', done => {
        remote.watch(msg=>{
            remote.log(msg);
        }, NotifyType.taskChanged).auth({directly:true}, msg => {
            remote.isSuccess(msg);
            remote.fetch({func:"1010"}, function(msg){
                done();
            });
        });
    });

    it('上报积分和金币,完成相关任务', function(done) {
        remote.auth().fetch({func: "1001", start:0}, msg => {//战斗开始
            remote.isSuccess(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
            remote.fetch({func: "1001", start:1, score:9000, money:3000}, msg => {//战斗结束，任务完成
                remote.isSuccess(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
                done(); //通知系统：测试用例顺利完成
            });
        });
    });

    it('执行登录、分享操作，以完成相关任务'/*单元测试的标题*/, /*单元测试的函数体，书写测试流程*/done =>{
        remote.auth(null, msg => {
            remote.isSuccess(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行
            remote.fetch({func:"1010"}, function(msg){
                remote.fetch({func:'task.list', type:0, status:1}, msg=>{
                    msg.data.map(item=>{
                        remote.log(item);
                    });
                    done(); //通知系统：测试用例顺利完成
                });
            });
        });
    });

    it('打印任务列表', done =>{
        remote.auth().fetch({func:'task.list', type:0, status:-1}, msg=>{//打印已经完成的任务
            msg.data.map(item=>{
                remote.log(item);
            });
            done();
        });
    });

    it('获取已完成任务列表，领取奖励直至全部执行完毕'/*单元测试的标题*/, /*单元测试的函数体，书写测试流程*/done =>{
        remote.auth(null, msg => {
            remote.isSuccess(msg); //使用断言，对返回值进行合理性判定，如判定失败则抛出异常，下面的 done 就不会被执行

            let rec = ()=>{
                remote.fetch({func:'task.list', type:0, status:1}, msg=>{
                    msg.data.map(item=>{
                        console.log(item.id, item.status);
                    });
                    if(msg.data.length > 0){
                        remote.fetch({func:'task.getBonus', id:msg.data[0].id}, msg=>{
                            remote.log(msg);
                            rec();
                        });
                    }
                    else{
                        done();
                    }
                });
            };

            rec();
        });
    });
});
