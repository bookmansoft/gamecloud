let Lock = require('../../facade/util/Lock');
let locker = new Lock(true);

//卡余额
let x = 1000;
//加锁标志
let locked = true;

describe('lock', ()=>{
    it.skip('ban reEnter', done=>{
        //消费函数
        async function purchase(){
            let unLock = ()=>{};

            if(locked){
                unLock = await locker.lock('add');
            }

            try{
                //查询用户余额 - 模仿数据库异步查询
                let read = new Promise(resolve=>{
                    setTimeout(()=>{
                        resolve(x);
                    }, Math.random()*1000*10);
                });
                let amount = await read;

                //消费判断和执行
                if(amount>=100){
                    amount -= 100;
                    console.log(`success! amount left ${amount}`);
                }
                else{
                    console.log('not enough money');
                }

                //存储新的余额 - 模仿数据库异步写入
                let write = new Promise(resolve=>{
                    setTimeout(()=>{
                        x = amount;
                        resolve();
                    }, Math.random()*1000*10);
                });
                await write;
            }
            finally{
                unLock();
            }
        }

        for(let i=0;i<20;i++){
            purchase();
        }

        done();
    });
});

