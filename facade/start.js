let facade = require('./Facade')

let env = !!process.env.sys ? JSON.parse(process.env.sys) : {
    serverType: facade.CoreOfLogic.mapping[0],      //待调测的服务器类型
    serverId: 1,            //待调测的服务器编号
    portal: true            //兼任门户（充当索引服务器），注意索引服务器只能有一台，因此该配置信息具有排他性
};  

if(env.constructor == String){
    env = JSON.parse(env);
}

(async () => {
    //系统主引导流程，除了必须传递运行环境变量 env，也可以搭载任意变量，这些变量都将合并为核心类的options对象的属性，供运行时访问
    if(env.portal) { //如果该服务器兼任门户，则启动索引服务
        await facade.boot({
            env:{
                serverType: "CoreOfIndex",
                serverId: 1
            }
        });
    }

    //可以使用如下方法添加路由：
    //1. 在 facade.boot 传入参数 static 中配置静态资源映射类路由
    //2. 在 facade.boot 传入参数 static 中配置动态函数类路由，自动注入节点对象，但不能运用中间件，也无法注入用户对象
    //3. 在控制器的 router 属性中配置动态函数类路由，优点是可以运用各种中间件如参数解析/用户鉴权、自动注入节点对象/用户对象，等等
    await facade.boot({
        env: env,
        //设置附加路由
        static: [
            ['/client/', './web/client'],
            ['/echo', params => {
                return 'OK';
            }],
        ] 
    }).then(core => {

    });
})();
