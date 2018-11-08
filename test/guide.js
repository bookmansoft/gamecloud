/**
 * Created by admin on 2017-06-27.
 */
let remote = require('../facade/util/clientComm')();

describe('新手引导', function(){
    it('连续推进新手引导，直至完成全部引导步骤', done=>{
        let first = true;
        remote.watch(ret=>{
            remote.log(ret); //用户登录后立刻就有NotifyType.guide下发
            if(first){
                first = false;
                if(!!ret && !!ret.gid){
                    //完成该步骤后，向服务端提交"步骤已完成"请求，
                    //服务端会立刻下发NotifyType.guide指示下一步的编号，如果为0表示所有步骤已结束
                    remote.fetch({func:"guide.finish", gid:ret.gid});
                }
                setTimeout(()=>{done();}, 2000);
            }
        }, remote.const.NotifyType.guide).watch(ret=>{
            remote.log(ret,"aaa");    //如果某个步骤完成后会有奖励，在此处监控NotifyType.guideBonus
        }, remote.const.NotifyType.guideBonus).auth({directly:true}, ()=>{});
    });
});
