let remote = require('../../facade/util/clientComm')();
let facade = require('../../facade/Facade')
let {ResType} = facade.const;

describe('挂机关卡', function() {
    it('挂机通关 - 持续挂若干关', done => {
        remote.auth({openid:"2222",directly:true}, msg=>{
            remote.isSuccess(msg);

            let recy = 0;
            function sendData(){
                remote.fetch({url:"q?act=100000&oper=5&gateNo=5&monsterNum=30"}, function(msg){
                    remote.isSuccess(msg, true);
                    if(recy++<60){
                        setTimeout(sendData, 1000);
                    }
                    else{
                        remote.fetch({url:"q?act=601001&oper=1"}, msg => {
                            remote.isSuccess(msg);
                            console.log(msg.data.rank);
                            msg.data.list.map(item=>{
                                console.log(JSON.stringify(item));
                            });
                            done();
                        });
                    }
                });
            }
            remote.fetch({url:`q?act=999003&oper=99&bonus=${ResType.Gold},5000`}, msg=>{
                remote.isSuccess(msg);
                remote.fetch({url:"q?act=500001&oper=2&pm=5000&id=1"}, msg=>{
                    remote.isSuccess(msg);
                    sendData();
                });
            });
        });
    });

    /**
     * 7 普通重生：所有英魂转为魂石；当前关卡变为1；所有装备等级变为1；如果保留宠物设定，则所有宠物等级变为1；金币复位到一个初始值：基数为10万，受科技影响
     */
    it('重生', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);

            remote.fetch({url:"q?act=100000&oper=7"}, function(msg){
                remote.isSuccess(msg, true);
                done();
            });
        });
    });

    /**
     * 8 高级重生：所有英魂转为魂石，装备、金币、当前关卡都保持不变
     * 条件：转生精灵时效在有效期内
     */
    it('高级重生', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);

            remote.fetch({url:"q?act=100000&oper=8"}, function(msg){
                remote.isSuccess(msg, true);
                done();
            });
        });
    });

    /**
     * 9 请求挂机
     */
    it('挂机', done=>{
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);

            remote.fetch({url:"q?act=100000&oper=9"}, function(msg){
                remote.isSuccess(msg, true);
                done();
            });
        });
    });

    /**
     * 10 请求使用元宝提前结束挂机
     */
    it('提前结束挂机', done=>{
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);

            remote.fetch({url:"q?act=100000&oper=10"}, function(msg){
                remote.isSuccess(msg, true);
                done();
            });
        });
    });

    /**
     * 11 立即终止挂机
     */
    it('立即完成挂机', done=>{
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);

            remote.fetch({url:"q?act=100000&oper=11"}, function(msg){
                remote.isSuccess(msg, true);
                done();
            });
        });
    });

    it('随机事件', done =>{
        remote.auth({directly:true}).fetch({url:"q?act=100001&eid=1"}, msg=>{
            remote.isSuccess(msg, true);
            done();
        });
    });
});
