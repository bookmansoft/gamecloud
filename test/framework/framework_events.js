/**
 * Created by admin on 2017-06-23.
 */
let EventEmitter = require('events').EventEmitter; //事件管理

describe('事件模式', function(){
    it('事件的分发和接收', done =>{
        //EventEmitter目前的机制，只能自己发自己收
        class A extends EventEmitter{
            constructor(){
                super();
                this.id = 10;

                //事件树定义
                this.events = {
                    user:{
                        login: data=>{
                            console.log(data);
                        },
                        logout: data=>{
                            console.log(this.id);
                        }
                    }
                };
                this.eventMapping = {};

                this.createEventHandle(this.events);
            }

            /**
             * 解析事件树定义，绑定事件类型和处理句柄
             * @param obj
             * @param path
             */
            createEventHandle(obj, path = ''){
                Object.keys(obj).map(key=>{
                    let newPath = !path ? key : `${path}.${key}`;
                    if(typeof obj[key] == 'function'){
                        let func = obj[key].bind(this);
                        this.on(newPath, func); //注册事件，绑定this指针到自身
                        this.eventMapping[newPath] = func;  //建立事件索引
                    }
                    else if(typeof obj[key] == 'object'){
                        this.createEventHandle(obj[key], newPath);//递归检测事件树定义
                    }
                });
            }

            /**
             * 移除事件
             * @param evt
             */
            removeEvent(evt){
                if(!!this.eventMapping[evt]){
                    this.removeListener(evt, this.eventMapping[evt]);
                }
            }
            addEvent(evt){
                if(!!this.eventMapping[evt]){
                    if(this.listenerCount(evt) == 0){//避免重复添加
                        this.on(evt, this.eventMapping[evt]);
                    }
                }
            }
        }

        let a  = new A();
        a.emit('user.login', {id:1});   //分发事件，注意事件是被实时处理的
        a.removeEvent('user.logout');   //删除事件
        a.addEvent('user.logout');      //再次订阅
        a.addEvent('user.logout');      //再次订阅，由于内部做了判断，因此不会重复添加
        a.emit('user.logout');          //分发事件，注意logout最多只会执行一次

        done();
    });
});
