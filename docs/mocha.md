## 单元测试规范（2016.3.25 liub）

## 运行环境

1、安装运行环境：安装 node7.8.0
2、安装项目依赖：项目根目录下运行 npm i
3、安装测试工具：npm i mocha -g
4、安装开发环境（可选）：安装 vs code
5、书写单元测试文件，统一放于项目根目录下的test中
6、运行单元测试：项目根目录下运行 mocha 即可回归所有单元测试. note: 压测时需要调高 mocha.opts 中 -t 参数的数值
7、单元测试中的修饰符
    可以为任意describe或it 添加 .only 以进行单独测试；改写为 .skip 则进行忽略
    可以为describe添加  before after beforeEach afterEach 等事件处理

## API列表

1、任务相关：task.js
2、验证相关：auth.js
4、商城相关：shop.js
5、内政相关（掷骰子、升级建筑等）：action.js
6、配置信息相关：config.js
    客户端从服务端获取各类配置文件，建议启动时一次性获取全部配置文件

附加说明：
1. 服务端返回结果的JSON格式:
```json
    {
        "code":"ReturnCode", 
        "data":{}
    }
```
其中code代表操作结果码，详查服务端ReturnCode的定义
data代表操作结果集，包含本次操作需要返回客户端的所有有效信息
除code和data之外，返回结果中不应该再包括任何其他字段。

2. 客户端和服务端的交互模式
- JSONP模式：发送Req报文并提供对应回调函数
- Notify模式：发送Req报文，不提供回调函数
- 监听模式：主动监听服务端主动推送的Notify类型的消息
