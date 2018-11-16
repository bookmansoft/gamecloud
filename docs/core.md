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
    async Start(app) {
        //... 代码略
    }

    /**
     * 映射自己的服务器类型数组，提供给核心类的类工厂使用
     */
    static get mapping() {
        if(!this.$mapping) {
            this.$mapping = ['Image']; //game.config.js 中类型为 Image 的节点，都将用 CoreOfImage 完成实例化
        }
        return this.$mapping;
    }
    static set mapping(val) {
        this.$mapping = val;
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
                    "portal": true              //指示该服务器兼任门户
                }
            }
        }
    ]
```

通过如下语句即可启动一个特定类型的节点：

```js
facade.boot({ env: { serverType: "Index", serverId: 1 } });
```
