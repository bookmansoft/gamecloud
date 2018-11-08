/**
 * Created by admin on 2017-06-27.
 */
let remote = require('../facade/util/clientComm')();

describe('活动管理', function(){
    it('检测活动当前状态', done=>{
        remote.auth({directly:true, openid:"446aaa6"}).fetch({func:"activity.getInfo"}, ret=>{
            //{id 活动编号, type 活动类型, state 活动状态, starttime 活动开始时间 endtime 活动结束时间 score 活动积分 act 领奖状态}
            remote.log(ret);
            done();
        });
    });

    it('领取活动奖励', done=>{
        remote.auth({directly:true, openid:"446.336"}).fetch({func:"activity.getBonus", id:0/* 0排名奖 1及以上分段奖*/}, ret=>{
            remote.log(ret);
            done();
        });
    });

    it('扫荡关卡,消耗体力，获取消耗体力积分', done =>{
        remote.auth({directly:true}).fetch({func:'gate.sweep', id:1}, msg=>{
            remote.log(msg);
            remote.fetch({func:'activity.getList'}, msg=>{
                //{score 积分, rank 排名, list:[] 当前页数据的数组, cur 当前页, total 总页数)};
                //{score 积分, rank 排名, list:[] 数据的数组)};
                remote.log(msg);
                
                remote.fetch({func:'gate.getSweepBonus'}, msg=>{
                    remote.log(msg);
                    done();
                });
            });
        });
    });

    it('获取活动信息', done=> {
        remote.auth({openid:"446aaa6"}).fetch({func: "dailyactivity.getInfo"}, ret => {
            remote.log(ret);
            done();
        });
    });
    it('进行活动', done=>{
        remote.auth({openid:"446aaa6"}).fetch({func:"dailyactivity.setScore",id:1000}, ret=>{
            remote.log(ret);
            done();
        });
    });

    it('进行活动排行', done=>{
        remote.auth({openid:"446aaa6"}).fetch({func:"dailyactivity.getList"}, ret=>{
            remote.log(ret);
            done();
        });
    });
    it('添加奖池金额', done=>{
        remote.auth({directly:true, openid:"446aaa6"}).fetch({func:"dailyactivity.addProp",choose:2,num: "2"}, ret=>{
            remote.log(ret);
            done();
        });
    });
    it('添加奖池金额', done=>{
        remote.auth().fetch({func:"dailyactivity.clearActivityInfo"}, ()=>{
            done();
        });
    });

    it('统计阵营人数', done=>{
        remote.auth({directly:true, openid:"446aaa6"}).fetch({func:"dailyactivity.countChoose"}, ret=>{
            remote.log(ret);
            done();

        });
    });
    it('统计奖池金额', done=>{
        remote.auth({directly:true, openid:"446aaa6"}).fetch({func:"dailyactivity.countProp"}, ret=>{
            remote.log(ret);
            done();

        });
    });
    it('查询是否参与预热', done=>{
        remote.auth({directly:true, openid:"446aaa6"}).fetch({func:"dailyactivity.checkJoin"}, ret=>{
            remote.log(ret);
            done();

        });
    });
    it('未参与预热玩家花费瓶盖参加', done=>{
        remote.auth({directly:true, openid:"446aassa6"}).fetch({func:"dailyactivity.toJoin"}, ret=>{
            remote.log(ret);
            done();

        });
    });
});
