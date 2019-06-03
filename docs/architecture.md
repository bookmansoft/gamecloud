# 系统体系结构

## 项目根目录

根目录下存放一些重要的系统文件

package.json        依赖包列表
gameconfig.js      节点部署配置文件
README.md           系统简介
LICENSE             版权声明
.gitignore          GIT仓库忽略文件列表

## facade 

系统核心代码
-    plugin: 存放对核心类进行扩充的函数集
        目录下default.js中的函数将直接挂接于CoreOfBase
        目录下{name}.js中的函数将挂接于CoreOfBase.{name}。函数的第一个参数env由系统自动注入，指向核心对象。
        例如，default.js 有一个函数 urlToCdn(env, url)，当前核心对象为 fo，则可以通过 fo.urlToCdn(url) 来调用该函数，其中 env 指向 fo。
        @note 之所以不采用this指针指向核心对象的方式，而是单独注入env参数，是因为前者很难借助词法分析器的帮助来降低函数书写的难度。
        @note 扩展函数的作者，需要在熟悉核心类内部构造的基础上，自行规避命名冲突问题

-    middleware：存放作用于来访信息流的用户自定义中间件
        系统中间件、用户自定义中间件的名称可以配置于 Control.middleware 中，例如：
            class test extends facade.Control {
                get middleware(){
                    return ['userDefine1', 'userDefine2'];
                }
            }
        指示对造访控制器test的信息流，依次应用 userDefine1、userDefine2 这两个中间件进行处理

-    core: 存放自定义的核心类。
        在当前框架中，每个独立进程启动时唯一创建一种核心类的单态实例，承载一定的功能集合。内置的核心类包括Index(注册码'Index'，可重定义)、Logic(注册码'IOS'、'Android'，可重定义)
        app/core 下有一个实现范例 CoreOfImage(注册码'Image')，承载抓取网络图片（例如社交网络的头像）的功能
        核心类的注册码可用于运行环境配置文件game.config.js中

-    util：存放自定义逻辑模块

-    model：存放数据库管理相关类
        entity：实体类，唯一对应一个ORM类，对其进行功能扩展，其实例可接受Mapping、Ranking等容器类的管理
        table：ORM类，直接映射一张数据库表
        assistant：ORM辅助类，针对 User(代表用户的ORM类) 的单个字段进行功能拓展，支持脏数据检测、自动序列化存储。例如，item提供用户背包管理功能，其存储结构映射为User.item上。

-   define：枚举和数据结构定义
-    control：访问控制类，规范了客户端/服务端远程交互接口，以及服务端/服务端RPC交互接口
-    events：自定义事件类，用于各模块间解耦
-    service：自定义扩展服务类(继承自FSM)，服务器启动时为这些类自动创建单例对象，注入为facade.current.service的属性成员

## app

该目录用于存放所有用户自定义代码

### plugin: 存放对核心类进行扩充的函数集

- 目录下default.js中的函数将直接挂接于CoreOfBase
- 目录下{name}.js中的函数将挂接于CoreOfBase.{name}。函数的第一个参数env由系统自动注入，指向核心对象。
例如，default.js 有一个函数 urlToCdn(env, url)，当前核心对象为 fo，则可以通过 fo.urlToCdn(url) 来调用该函数，其中 env 指向 fo。

@note 之所以不采用this指针指向核心对象的方式，而是单独注入env参数，是因为前者很难借助词法分析器的帮助来降低函数书写的难度。
@note 扩展函数的作者，需要在熟悉核心类内部构造的基础上，自行规避命名冲突问题
    
### middleware

存放作用于来访信息流的用户自定义中间件。

### core: 存放自定义的核心类。
在当前框架中，每个独立进程启动时唯一创建一种核心类的单态实例，承载一定的功能集合。内置的核心类包括Index(注册码'Index')、Logic(注册码'IOS'、'Android')
app/core 下有一个实现范例 CoreOfImage(注册码'Image')，承载抓取网络图片（例如社交网络的头像）的功能
核心类的注册码可用于运行环境配置文件game.config.js中

### util：存放自定义逻辑模块
### model：存放数据库管理相关类
- entity：ORM映射类，唯一对应一个ORM底层类，对其进行功能扩展，其实例可接受Mapping、Ranking等容器类的管理
- table：表映射类，直接映射一张数据库表
- assistant：ORM辅助类，针对 User(代表用户的ORM类) 的单个字段进行功能拓展，支持脏数据检测、自动序列化存储。例如，item提供用户背包管理功能，其存储结构映射为User.item上。

### define：枚举和数据结构定义

### control：访问控制类
规范了客户端/服务端远程交互接口，以及服务端/服务端RPC交互接口

### events：自定义事件类
用于各模块间解耦

### service：自定义扩展服务类(继承自FSM)

服务器启动时为这些类自动创建单例对象，注入为facade.current.service的属性成员

## config

该目录集中存放 HTTPS证书、配置文件、系统维护任务、数据迁移记录

-    cert:https证书
-    data：数据配置文件
-    maintain：维护和数据修复
-    migrations：数据库迁移

## .gamegold

该目录用于 gamegold 节点存放配置信息和数据库文件

## docs

该目录存放系统说明文档，作为根目录下 README.md 的扩展阅读

## logs

该目录记录系统运行日志

## test

该目录存放单元测试文件

## web

该目录存放静态资源文件，用于架设对外服务的 Web Server

## coverage

覆盖率测试报告，可以使用如下命令重新生成：

```bash
npm run cover
```
