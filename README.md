# 游戏云服务器 gamecloud

## 概述

游戏云服务器(gamecloud)是一个基于NodeJS技术开发的纯JavaScript服务端引擎，为H5游戏量身定做，其特点如下：

- 开箱即用。

游戏云服务器 的设计理念是，"简单是不够的，要极其简单"。

- 开放式设计。

游戏云服务器 自然融入 npm 生态，你可以通过第三方库或自定义代码，利用插件、扩展服务、中间件、自定义事件、新增核心类等机制，随时对框架进行补足和增强。

- 可伸缩性设计

### 关于集群
- gamecloud 是一个可伸缩集群，整个集群由单台或多台服务器组成。
- 集群运行多个不同类型的节点，灵活分配于各台服务器上，可在 ./game.config.js 中完成配置
- 建议起步阶段以单服务器模式运行，熟悉体系后再扩展至由多台服务器组成的集群

```js
let config = { 
    "servers": [],      //集中配置集群中所有节点，在集群中所有服务器上保持一致
    "apps": [],         //配置当前服务器运行的节点列表
}
```

- 集群中，有且只有一个节点兼任门户节点

```js
    "apps" : [
        {
            "name"      : "Chick_IOS_1",
            "script"    : "facade/start.js",
            "cwd"         : "./",
            "error_file" : "./logs/ios1/app-err.log",
            "env": {
                "NODE_ENV": "production",
                "sys":{
                    "serverType": "IOS",
                    "serverId": 1,
                    "portal": true  //指示该节点兼任门户
                }
            }
        }
    ]

```

## 搭建运行环境

1. 安装系统软件，如已经具备条件请跳过

- 安装 mysql 数据库软件，默认排序规则选择 utf8_general_ci

- 安装 python@2.7

- 安装 git@2.19.1

- 安装 node@10.13

- 安装 node-gyp

```bash
npm i -g node-gyp
```

- Windows环境下补充安装

```bash
npm i -g --production windows-build-tools
```

2. 下载软件仓库、安装依赖包

```bash
git clone https://github.com/bookmansoft/gamecloud
npm i
```

3. 创建并初始化数据库

**该项工作在集群的每台服务器上都需要独立执行**

**如何快速执行**
如果当前服务器已安装mysql，且用户名密码对为 root / helloworld 时，可直接执行如下指令，并跳过 3.1 3.2 3.3 各步骤
```bash
npm run dbinit
```

- 3.1 配置数据库连接参数，用于本地数据库的数据迁移流程

    修改配置文件 ./config/migrations/gamecloud.json , 修改其中 password 等字段

    **该配置文件在集群中不同服务器上独立配置**
    ```json
    {
    "dev": {
        "driver": "mysql",
        "user": "root",
        "password": "helloworld",
        "host": "localhost",
        "database": "gamecloud",
        "multipleStatements": true
    }
    }
    ```

- 3.2 手动创建数据库，**执行此步骤后请跳过 3.3**

    - 创建数据库 gamecloud , 建议使用此默认名称，如修改则需相应调整各配置文件

    - 数据库初始化

    ```bash
    npm run commit
    ```

- 3.3 自动创建数据库

    - 配置数据库连接参数，用于本地数据库的创建流程

    修改配置文件 ./config/database.json , 修改其中 password host 字段

    **该配置文件在集群中不同服务器上独立配置**
    ```json
    {
    "dev": {
        "driver": "mysql",
        "user": "root",
        "password": "helloworld",
        "host": "localhost"
    }
    }
    ```

    - 创建并初始化数据库

    ```bash
    npm run dbinit
    ```

## 运行游戏云服务器

1. 配置数据库连接参数，用于各节点的数据库连接串

修改 ./game.config.js 文件中 sa pwd host 字段

```js
/**
 * 统一的数据库连接串，如果不同服务器连接不同数据库，需要改写 config 中各个 mysql 字段
 */
let mysql = {
    "logging" : false,          //是否开启日志
    "db": "gamecloud",          //数据库名称    
    "sa": "root",               //数据库用户名
    "pwd": "helloworld",        //数据库用户密码
    "host": "127.0.0.1",        //数据库服务器IP地址
    "port": 3306                //数据库服务器端口号
};
```

2. 运行服务器

**该步骤使用了 PM2 进程管理软件，一次性启动所有当前服务器上已配置节点**
```bash
npm start
```

3. 运行单元测试

```bash
npm run test
```

4. 停止游戏云服务器

```bash
npm stop
```

## 调试代码

建议使用 vs code 进行代码调试工作，

- 在 vs code 中配置 launch.json：

```js
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "启动程序",
            "program": "${workspaceFolder}\\facade\\start.js"
        }
    ]
}
```

- 按下 F5 运行，设置合适的断点

- 运行单元测试，触发断点，进入单步跟踪模式

```bash
npm run test
```

## 部署网站

gamecloud 作为游戏服务端引擎的同时，也可以承担静态网站服务器功能：

```js
//设置静态资源映射, 注意必须在调用 facade.boot 之前设置
facade.static('/client/', './web/client');
```

服务器启动后，可以通过浏览器访问 http://localhost:9901/client 访问工作目录的子目录 web/client 中的静态资源

典型的工作场景为：
1. 架设 gamecloud 作为 JSONP 服务器，并设置静态资源映射. 建议通过基于 gamecloud 的 gamegold-mgr-server 脚手架项目，制作高度可定制网站
2. 使用 React / AngularJs / VUE / CocosCreator 开发单页面应用，打包并拷贝到已映射目录中，即可对外提供服务

## Roadmap

V1.5 和游戏金公链平台无缝整合，一键式开发DAPPS应用
V1.6 内置 BTC / BCH / ETH 等主流数字货币的支付接口
V2.0 支持 k8s 架构，进一步增强易用性和可伸缩性
