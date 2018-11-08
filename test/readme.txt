概述：单元测试规范（2016.3.25 liub）：
1、安装运行环境：安装 node7.8.0
2、安装项目依赖：项目根目录下运行 npm i
3、安装测试工具：npm i mocha -g
4、安装开发环境（可选）：安装 WebStorm 2017.1
5、书写单元测试文件，统一放于项目根目录下的test中
6、运行单元测试：项目根目录下运行 mocha 即可回归所有单元测试. note: 压测时需要调高 mocha.opts 中 -t 参数的数值
7、可以为任意describe或it 添加 .only， 以进行单独测试；改写为 .skip 则进行忽略，可以为describe添加  before after beforeEach afterEach 等事件处理
8、安装supervisor（可选）：npm i supervisor -g, 在WebStorm中配置supervisor作为解析器，获取热更特性
9、安装pm2（进程监控）:
    npm i pm2 -g
    pm2 install profiler

服务端API列表：
1、任务相关：task.js
2、验证相关：auth.js
4、商城相关：shop.js
5、内政相关（掷骰子、升级建筑等）：action.js
6、配置信息相关：config.js
    客户端从服务端获取各类配置文件，建议启动时一次性获取全部配置文件

附加说明：
1、服务端返回结果的JSON格式永远是 {code:ReturnCode, data:{}}，其中err代表操作结果码，详查服务端ReturnCode的定义，info代表操作结果集，包含本次操作需要返回客户端的所有有效信息，
    除err和info之外，返回结果中不应该再包括任何其他字段。
2、客户端除了发送Req报文并提供对应回调函数外（所谓JSONP模式），也可以单独发送Notify类型的报文（不必提供回调函数），还应该主动监听服务端主动推送的Notify类型的消息
3、单元测试中使用的 fetch 函数，是为了降低书写case的难度，其组织形式和客户端发送报文模式略有不同：
    1、fetch 函数中传入的params，其中的 openid 和 send 这两个参数只是为了达到客户端流程定制的目的，并不需要实际发送到服务端
    2、最终的发送函数形式请参见 facade/util/clientComm.js:fetch

2017.6.19
新增接口说明：
1、体力
