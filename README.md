《facade》是一个基于NodeJS技术开发的纯JavaScript服务端引擎，适用于H5游戏和中小型信息管理系统，其特点如下：
1、开箱即用。facade的设计理念是，"简单是不够的，要及其简单"
2、开放式设计。facade拥抱社区、和npm自然接轨，你可以通过第三方库或自定义代码，利用插件、扩展服务、中间件、自定义事件、新增核心类等机制，随时对框架进行补足和增强。

@note 核心类：CoreOfBase或其子类
@note 核心对象：核心类的单态实例

facade按照目录组织功能，第一级目录：
facade：框架核心代码
app：用户自定义代码
config：配置信息
test：单元测试
coverage：覆盖率测试报告
logs：日志文件

facade和app内部目录结构基本相似，描述如下：
    plugin: 存放对核心类进行扩充的函数集
        目录下default.js中的函数将直接挂接于CoreOfBase
        目录下{name}.js中的函数将挂接于CoreOfBase.{name}。函数的第一个参数env由系统自动注入，指向核心对象。
        例如，default.js 有一个函数 urlToCdn(env, url)，当前核心对象为 fo，则可以通过 fo.urlToCdn(url) 来调用该函数，其中 env 指向 fo。
        @note 之所以不采用this指针指向核心对象的方式，而是单独注入env参数，是因为前者很难借助词法分析器的帮助来降低函数书写的难度。
        @note 扩展函数的作者，需要在熟悉核心类内部构造的基础上，自行规避命名冲突问题
    middleware：存放作用于来访信息流的用户自定义中间件
        系统中间件、用户自定义中间件的名称可以配置于 Control.middleware 中，例如：
            class test extends facade.Control {
                get middleware(){
                    return ['userDefine1', 'userDefine2'];
                }
            }
        指示对造访控制器test的信息流，依次应用 userDefine1、userDefine2 这两个中间件进行处理
    core: 存放自定义的核心类。
        在当前框架中，每个独立进程启动时唯一创建一种核心类的单态实例，承载一定的功能集合。内置的核心类包括Index(注册码'Index')、Logic(注册码'IOS'、'Android')
        app/core 下有一个实现范例 CoreOfImage(注册码'Image')，承载抓取网络图片（例如社交网络的头像）的功能
        核心类的注册码可用于运行环境配置文件game.config.js中
    util：存放自定义逻辑模块
    model：存放数据库管理相关类
        entity：实体类，唯一对应一个ORM类，对其进行功能扩展，其实例可接受Mapping、Ranking等容器类的管理
        table：ORM类，直接映射一张数据库表
        assistant：ORM辅助类，针对 User(代表用户的ORM类) 的单个字段进行功能拓展，支持脏数据检测、自动序列化存储。例如，item提供用户背包管理功能，其存储结构映射为User.item上。

    define：枚举和数据结构定义
    control：访问控制类，规范了客户端/服务端远程交互接口，以及服务端/服务端RPC交互接口
    events：自定义事件类，用于各模块间解耦
    service：自定义扩展服务类(继承自FSM)，服务器启动时为这些类自动创建单例对象，注入为facade.current.service的属性成员

config目录的二级目录描述如下：
    cert:https证书
    data：数据配置文件
    maintain：维护和数据修复
    migrations：数据库迁移

-- 更新日志 --

2017.5.11
    1、新增WebSocket接口
    2、引入服务器之间RPC机制
    3、添加后台管理界面

2017.5.12
    1、完善注册判断，避免混服现象

2017.5.14
    服务端框架扩展：
    1、整合短连、长连的路由和报文解析
    2、封装RPC调用机制
    3、完善后台管理平台的功能

2017.5.26: events目录下放置 Logic Server 内部使用的消息句柄文件，对应的消息类型为消息句柄文件的局部路径拼接字符串（从events开始）
    例如：
        user/afterLogin.js输出 handle 函数，作为对"user.afterLogin"消息的处理句柄
        socket/userKick.js输出 handle 函数，作为对"socket.userKick"消息的处理句柄

    注：理论上目录可以无穷嵌套，但必须能准确表达消息的合理分类
    注：句柄文件中的this指针由外部注入，指向Facade门面对象

2017.5.58:
    1、新增关卡管理系统
    2、新增体力值
    3、新增家族系统

2017.5.30:
    1、新增回头率统计数据
    2、新增注册、消费、在线统计数据

@note：Sequelize模型中，默认必须存在id字段作为Primary key，如果无此字段会造成插入异常

2017.6.29:
    1、新增分段积分系统
    2、新增新手引导管理系统

2017.6.30:
    1、普查所有await语句，添加try结构，预防未处理的reject导致系统异常
    2、核查内部RPC机制，避免内部通讯异常导致的功能失灵

2017.7.2：
    1、好友在线状态显示问题：用户上线时看到的好友在线状态都是离线，要等到好友重新上线后才会更新为在线
    2、头像图片服务器偶尔报异常：使用Request取代了原先的Promise模式
    3、好友列表分数为0
    4、好友中出现自己
    5、好友排行中重复出现
    6、好友界面头像可能没有

2017.7.12:
    mysql>show variables like 'max_connections';    (查可以看当前的最大连接数)
    msyql>set global max_connections=1000;          (设置最大连接数为1000，可以再次查看是否设置成功)    
    npm list 检查下依赖关系，对缺失的包手工安装下。

2017.8.13:
    1、新增CLI应用，可以向运行中的程序发布实时指令，例如：关闭Socket接口、强制保存用户数据，最后关闭进程

2017.8.26 Redis客户端整改方案：
    1、找出数据更新不及时、失败的深层原因，了解Node-Redis的断线重连机制
    2、对Redis常用功能进一步封装，包括哈希、集合、KV，以及游标操作
    3、应对Node异步操作可能带来的数据同步问题

2017.12.2
    1、对框架进行封装，重新划分目录，更好的区隔框架代码和用户自定义代码
    
2017.12.4
    准备采用React，重构配套的管理后台框架
    nightmare e2e mock

2017.12.27
    openssl genrsa 1024 > key.pem
    openssl req -x509 -new -key key.pem > key-cert.pem
    
    Linux 下的工具们通常使用 base64 编码的文本格式，相关常用后缀如下：
    * .key：私钥
    * .csr: 证书请求, CA签名后成为证书
    * .crt, .pem：证书
    * der - 二进制编码格式
    * pem - base64编码格式

    在生成证书的过程中真正要填的是Common Name，通常填写服务器域名或服务器IP地址

2017.12.28

1、使用 node-http-proxy 实现反向代理
    安装：
```bash
    npm install http-proxy  
```
2、代码示例：
```javascript
var http = require('http'), httpProxy = require('http-proxy');  
  
// 新建一个代理 Proxy Server 对象  
var proxy = httpProxy.createProxyServer({});  
  
// 捕获异常  
proxy.on('error', function (err, req, res) {  
  res.writeHead(500, {  
    'Content-Type': 'text/plain'  
  });  
  res.end('Something went wrong. And we are reporting a custom error message.');  
});  
  
// 另外新建一个 HTTP 80 端口的服务器，也就是常规 Node 创建 HTTP 服务器的方法。  
// 在每次请求中，调用 proxy.web(req, res config) 方法进行请求分发  
var server = require('http').createServer(function(req, res) {  
  // 在这里可以自定义你的路由分发  
  var host = req.headers.host, ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;  
  console.log("client ip:" + ip + ", host:" + host);  
    
  switch(host){  
    case 'aaaa.com':  
        proxy.web(req, res, { target: 'http://127.0.0.1:81' });  
        break;  

    case 'ddd.com':  
        if(req.url.indexOf('/news') != -1){  
            res.writeHead(302, {  
                'Location': 'http://127.0.0.1:82/news/'
            });  
            res.end();  
        }else{  
            proxy.web(req, res, { target: 'http://127.0.0.1:83' });    
        }  
        break;  

    default:  
        res.writeHead(200, {  
            'Content-Type': 'text/plain'  
        });  
        res.end('Welcome to my server!');  
        break;
  }  
});  
  
console.log("listening on port 80")  
server.listen(80);  
```

#2018-01-28
如果在两个模块中相互引入对方，则极有可能导致引入异常，比如引入的类变为 {} 这样的结构，这可能是编译器为了避免更为严重的后果（例如死循环）而做的设定。
