/**
 * 单元测试：压力测试
 * Creted by liub 2017.3.28
 *
 * @note 执行前修改mocha.opts中超时时长
 */
let remote = require('./../facade/util/clientComm')();
let {wait} = require('../facade/util/commonFunc');

describe.skip('压力测试',  function() {
    it('同时在线', async done =>{
        let dl = ["tx.IOS", "tx.Android"];
        let j = 0;
        while(j++< 5000){
            remote.newone.auth({domain: dl.randObj(), openid:`${remote.config.auth.openid}.${j}`}, msg=>{
                remote.isSuccess(msg);
                console.log(j);
            });

            //等待一段时间后再执行下一轮
            await wait(50);
        }
        await wait(5000);
        done();
    });

    it('并发登录', async function(done) {
        let presure = [0, 100]; //设置压力参数: [循环次数,单次并发]

        //region Promise模式：
        let dl = ["tx.IOS", "tx.Android"];
        
        let j = 0, total = 0;
        while(j++ < presure[0] || presure[0] == 0){
            let list = [];

            console.time('create case');
            for(let i = j*presure[1]; i< (j+1)*presure[1]; i++){
                //手工指定登录openid
                let openid = `${remote.config.auth.openid}.${i+280000}`;
                //提交登录请求
                list.push(
                    new Promise(resolve=>{ 
                        let _rm = remote.newone;
                        _rm.auth({domain: dl.randObj(), openid:openid}, ()=>{
                            resolve(_rm.userInfo.openid);
                        });
                    })
                );
                total++;
            }
            console.timeEnd('create case');

            console.time('execute case');
            // Promise 并行执行
            await (new Promise(resolve=>{
                Promise.all(list).then(rets=>{
                    resolve();
                }).catch(e=>{
                    resolve();
                }); 
            }));
            console.timeEnd('execute case');
            console.log(`total:${total}`);

            //等待一段时间后再执行下一轮
            await wait(3000);
        }

        done();

        //endregion
    });
});
