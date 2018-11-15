# 节点类的开发

## 节点类的存储

所有的用户自定义节点存储于 /app/core/ 目录下

## 节点类的书写

所有的节点类都是 CoreOfBase 的子类。以 CoreOfImage 为例：

```js
/**
 * 实现图像服务端中转的门面类
 */
class CoreOfImage extends CoreOfBase {
    async Start(app){
        let hrv = this.options.UrlHead == "https" ? require(this.options.UrlHead).createServer(this.credentials, app) : require(this.options.UrlHead).createServer(app);

        //启动网络服务
        hrv.listen(this.options.webserver.port, this.options.webserver.host, () => {
            console.log(`图片服务在端口 ${this.options.webserver.port} 上准备就绪`);
        });

        //抓取跨域图片
        app.get('/socialImg', (req, res) => {
            if(!!req.query.m) {
                try {
                    rp({uri: decodeURIComponent(req.query.m),headers: {'User-Agent': 'Request-Promise',}}).pipe(res);
                } catch(e) {
                    console.error(e);
                    res.end();
                }
            }
            else {
                try {
                    rp({uri: decodeURIComponent(this.facade.configration.DataConst.user.icon),headers: {'User-Agent': 'Request-Promise',}}).pipe(res);
                } catch(e) { 
                    console.error(e);
                    res.end();
                }
            }
        });
    }

    /**
     * 映射自己的服务器类型数组，提供给核心类的类工厂使用
     */
    static mapping(){
        return ['Image'];
    }
}

```

## 节点的运行

可以在 game.config.js 中进行节点的统一配置：

```js
let config = {
    //配置集群中所有的节点，指明其类型、编号、配置信息
    "servers": {
        "Index":{                               //相同类型的节点分组
            "1":{                               //分组内各节点的编号
                "UrlHead": "http",              //协议选择: http/https
                "mysql": {                      //数据库连接信息
                    "logging" : false,          //记录日志
                    "db": "gamecloud",          //数据库名称    
                    "sa": "root",               //数据库用户名
                    "pwd": "helloworld",        //数据库用户密码
                    "host": "127.0.0.1",        //数据库服务器IP地址
                    "port": 3306                //数据库服务器端口号
                },
                "webserver": {                  //WEB服务器配置信息
                    "mapping": "127.0.0.1",     //映射绑定地址
                    "host": "127.0.0.1",        //内部IP地址
                    "port": 9901                //监听端口
                },
            }
        }
    },

    //配置当前服务器上需要运行的节点
    "apps":[
        {
            "name"      : "gamecloud_IOS_1",
            "script"    : "app/start.js",
            "env": {
                "NODE_ENV": "production",
                "sys":{
                    "serverType": "IOS",
                    "serverId": 1,
                    "portal": true //指示该服务器兼任门户
                }
            }
        }
    ]
```

通过如下语句即可启动一个特定类型的节点：

```js
facade.boot({ env: { serverType: "Index", serverId: 1 } });
```
