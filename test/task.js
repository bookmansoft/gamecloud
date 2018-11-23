/**
 * 单元测试：任务系统
 * Creted by liub 2018.11.23
 */

const remote = require('./js/util')

let uinfo = {domain: 'tx.IOS', openid: `${Math.random()*1000000000 | 0}`};

describe.only('任务', function() {
    beforeEach(async () => {
        let msg = await remote.login(uinfo);
    });

    it('执行登录、分享操作，以完成相关任务', async () => {
        await remote.fetching({func:"social.share"});
        let msg = await remote.fetching({func:'task.list', type:0, status:1});
        console.log(msg);
    });

    it('打印任务列表', async () => {
        let msg = await remote.fetching({func:'task.list', type:0, status:-1});
        console.log(msg);
    });

    it('获取已完成任务列表，领取奖励直至全部执行完毕', async () => {
        let rec = async () => {
            let msg = await remote.fetching({func:'task.list', type:0, status:1});
            console.log(msg);

            if(!!msg.data && msg.data.length > 0){
                msg = await remote.fetching({func:'task.getBonus', id:msg.data[0].id});
                remote.log(msg);

                await rec();
            }
        };

        await rec();
    });
});
