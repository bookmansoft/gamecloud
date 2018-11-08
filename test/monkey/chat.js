let remote = require('../../facade/util/clientComm')();

describe('联盟', function() {
    it('两个用户私聊', done => {
        let first = true;
        let userList = ["777.492", "777.493"];
        let remoteList = [remote.newone, remote.newone];
        Promise.all([
            new Promise(resolve=>{remoteList[0].auth({directly:true, openid: userList[0]}, ()=>{resolve({id:remoteList[0].userInfo.id, openid:userList[0]});});}),
            new Promise(resolve=>{remoteList[1].auth({directly:true, openid: userList[1]}, ()=>{resolve({id:remoteList[1].userInfo.id, openid:userList[1]});});}),
        ]).then(ret=>{
            remoteList[1].watch(msg=>{
                remoteList[1].log(msg);
                if(first){
                    first = false;
                    done();
                }
            }, remote.const.NotifyType.chat);

            remoteList[0].fetch({url:`q?act=102001&nid=${ret[1].id}&c=hello`}, msg=>{});
        }).catch(e=>{});
    });

    //注意：当前系统设定，要求两个用户必须同服
    it('世界聊天', done =>{
        let first = true;
        let users = ["777.492", "777.493"];
        let remotes = [remote.newone, remote.newone];
        remotes[1].watch(msg=>{
            remotes[1].log(msg);
            if(first){
                first = false;
                done();
            }
        }, remote.const.NotifyType.chat).auth({directly:true, openid: users[1]}, ()=>{});
        remotes[0].auth({directly:true, openid: users[0]}).fetch({url:'q?act=102001&c=hello'}, msg=>{});
    });

    it('收到系统公告', done =>{
        let first = true;
        remote.watch(msg=>{
            remote.log(msg);
            if(first){
                first = false;
                done();
            }
        }, remote.const.NotifyType.chat).auth({directly:true}, msg=>{
            remote.isSuccess(msg,true);
        });
    });
});
