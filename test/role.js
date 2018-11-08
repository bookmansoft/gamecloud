/**
 * 单元测试：角色管理
 * Creted by liub 2017.3.24
 */
let remote = require('../facade/util/clientComm')();

describe('角色管理', function() {
    it('获取角色列表', done =>{
        remote.auth({openid:"baaaaabbb"}).fetch({func:'role.list'},msg => {
            remote.isSuccess(msg, true);
            done();
        });
    });

    /**
     * 升级指定角色，传入参数：id 角色编号（1001~1008）
     */
    it('购买碎片，然后升级', function(done) {
        remote.auth({openid:"baaaaabbb"}).fetch({func:"1003", id:1002, num:40}, msg => {
            remote.log(msg);
            remote.fetch({func:'role.upgrade', id:1002}, msg => {
                remote.log(msg);
                done();
            });
        });
    });
    /**
     * 角色技能升级
     */
    it('技能升级', function(done) {
        remote.auth({openid:"baaaaabbb"}).fetch({func:'role.skill', id:1001,skid:1,price:182}, msg => {
                remote.log(msg);
                done();
            });
    });
    it('角色分享', function(done) {
        remote.watch(msg=>{//如果获得新角色则系统公告
            remote.log(msg);
        }, remote.const.NotifyType.roleShare).auth({openid:"bbbb"}).fetch({func:"role.share", id:1001, choose:1}, msg => {
            remote.log(msg);
            done();
        });
    });
    it('场景分享', function(done) {
        remote.watch(msg=>{
            remote.log(msg);
        }, remote.const.NotifyType.sceneShare).auth({openid:"bbbb"}).fetch({func:"sceneShare", type:1}, msg => {
            remote.log(msg);
            done();
        });
    });
    it('角色关联场景解锁', function(done) {
        remote.auth({openid:"baaaaabbb"}).fetch({func:"role.unlockedScene"}, msg => {
            remote.log(msg);
            done();
        });
    });
    it('玩吧兑换钻石 - 1006', function(done){
        remote.watch(msg=>{//如果获得新角色则系统公告
            remote.log(msg);
        }, remote.const.NotifyType.taskChanged).auth({openid:'123456'}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({func:"1006", "itemid": 14073, "count": 100}, msg => {
                remote.log(msg);
                done();
            });
        });
    });
    it('获取指定任务信息', function(done) {
        remote.auth().fetch({func:"task.getInfo",id:1055}, msg => {
            remote.log(msg);
            done();
        });
    });
});
