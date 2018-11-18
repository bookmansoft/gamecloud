# 如何开发控制器

## 控制器的组织结构

在 app/control 目录下存放所有用户级控制器, **按照节点类型分类**，目前包括两个类别：
- CoreOfIndex: 门户服务器专用控制器
- CoreOfLogic: 逻辑服务器专用控制器

每个控制器都包含一个单独的类，这些类都是 facade.Control 的子类。
控制器类名和文件名保持一致

## 控制器的外部接口

控制器外部接口名称的组织方式为 `${className}.${funcName}`，例如，test.js 包含 test 类，其 notify 成员方法的外部接口是 'test.notify', 调用方法如下所示：

```js
//引入工具包
let {gameconn} = require('gamegoldtoolkit');

//创建连接器对象
let remote = new gameconn(
    gameconn.CommMode.ws,               //使用 WebSocket 连接方式
    {
        "UrlHead": "http",              //协议选择: http/https
        "webserver": {
            "host": "127.0.0.1",        //远程主机地址
            "port": 9901                //远程主机端口
        },
        "auth": {
            "openid": "18681223392",    //用户标识
            "openkey": "18681223392",   //和用户标识关联的用户令牌
            "domain": "tx.IOS",         //用户所在的域，tx是提供登录验证服务的厂商类别，IOS是该厂商下的服务器组别
        }
    }
)
.setFetch(require('node-fetch'));      //设置node服务端环境下的fetch函数，只在node服务端环境中执行，浏览器环境自带fetch函数

remote.fetching({func: "test.notify", msg: 'helloworld'}, msg => { 
    console.log(msg);
});
```
