let remote = require('../../facade/util/clientComm')();
let ConfigManager = require('../../facade/util/potential/ConfigManager')

describe('PVE伙伴管理', function() {
    it('计算高阶升级费用', () =>{
        console.log("从0级升级到50W级所需花费", JSON.stringify(ConfigManager.getCostCPet(0,500000)));
    });

    it('计算PVE宠物基础攻击力', ()=>{
        console.log(ConfigManager.getPowerFormula(1)(500000));
    });

    it('进阶', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);

            // * name     | type     | description of param
            // * ---------|----------|--------------------
            // * oper     | int      | 操作码 1查询 2升级 3切换 4激活 5进阶
            // * id       | int      | 指定的宠物编号，查询列表时可不填写
            // * pm       | int      | 附加参数，升级时表示一次升多少级
            remote.fetch({url:"q?act=504001&oper=5&id=2"}, function(msg){
                remote.isSuccess(msg);
                done();
            });
        });
    });

    it('切换', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=504001&oper=3&id=1"}, function(msg){
                remote.isSuccess(msg);
                remote.fetch({url:"q?act=503001&oper=1"}, function(msg){
                    remote.isSuccess(msg);
                    console.log(msg.data.effects);
                    done();
                });
            });
        });
    });

    it('激活', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=504001&oper=4&id=7"}, function(msg){
                remote.isSuccess(msg);
                done();
            });
        });
    });

    it('升级', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=504001&oper=2&pm=1000"}, function(msg){
                remote.isSuccess(msg);
                console.log(msg.data.powerClick);
                done();
            });
        });
    });

    it('查询列表', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);
            remote.fetch({url:"q?act=504001&oper=1"}, function(msg){
                remote.isSuccess(msg);
                console.log('current: ', msg.data.active);
                Object.keys(msg.data.items).map(key=>{
                    console.log(msg.data.items[key]);
                });
                done();
            });
        });
    });
})
