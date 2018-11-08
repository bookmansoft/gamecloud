let remote = require('../../facade/util/clientComm')();

describe('图腾管理', function() {
    it('获取待激活的图腾列表, 并激活其中的第一项', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);

            //获取随机的待激活图腾
            remote.fetch({url:"q?act=501002&count=4"}, function(msg){
                remote.isSuccess(msg);
                if(!!msg.data.items && Object.keys(msg.data.items).length>0){
                    //激活第一项
                    remote.fetch({url:`q?act=501001&oper=2&id=${msg.data.items[Object.keys(msg.data.items)[0]].i}`}, function(msg){
                        remote.isSuccess(msg);

                        //查询所有已激活图腾的列表
                        remote.fetch({url:"q?act=501001&oper=1"}, function(msg){
                            remote.isSuccess(msg);
                            Object.keys(msg.data.items).map(key=>{
                                console.log(JSON.stringify(msg.data.items[key]));
                            });

                            done();
                        });
                    });
                }
                else{
                    console.log("图腾已全部激活");
                    done();
                }
            });
        });
    });

    it('查询所有已激活图腾的列表', done => {
        remote.auth({directly:true}, msg=>{
            remote.isSuccess(msg);

            remote.fetch({url:"q?act=501001&oper=1"}, function(msg){
                remote.isSuccess(msg);
                Object.keys(msg.data.items).map(key=>{
                    console.log(JSON.stringify(msg.data.items[key]));
                });
                done();
            });
        });
    });
})

