/**
 * 单元测试：聊天
 * updated by liub 2017.5.17
 */
let remote = require('../facade/util/clientComm')()
let {NotifyType} = require('../facade/define/comm')

describe('聊天', function() {
    //注意：当前系统设定，要求两个用户必须同服
    it('两个用户私聊', function(done) {
        let first = true;
        let userList = ["777.492", "777.493"];
        let remoteList = [remote.newone, remote.newone];
        Promise.all([
            new Promise(resolve=>{remoteList[0].auth({openid: userList[0]}, ()=>{resolve({id:remoteList[0].userInfo.id, openid:userList[0]});});}),
            new Promise(resolve=>{ setTimeout(()=>{remoteList[1].auth({openid: userList[1]}, ()=>{resolve({id:remoteList[1].userInfo.id, openid:userList[1]});});}, 200) }),
        ]).then(ret=>{
            remoteList[1].log(ret);
            remoteList[1].watch(msg=>{
                remoteList[1].log(msg);
                if(first){
                    first = false;
                    done();
                }
            }, NotifyType.chat);
            remoteList[0].fetch({func:'chat.sendChat', nid:ret[1].id, c:'hello'});
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
        }, NotifyType.chat).auth({openid: users[1]}, ()=>{});
        remotes[0].auth({openid: users[0]}).fetch({func:'chat.sendChat', c:"1"});
    });

    it('收到系统公告', done =>{
        let first = true;
        remote.watch(msg=>{
            remote.log(msg);
            if(first){
                first = false;
                done();
            }
        }, NotifyType.chat).auth(null, msg=>{
            remote.isSuccess(msg,true);
        });
    });
});
