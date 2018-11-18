# 中间件

## 中间件的存储

所有的用户自定义中间件存放于 app/middleware/ 目录下

## 中间件的书写

中间件的可索引名称就是存放中间件的文件名，每个文件中包含一个异步函数，如下所示：

```js
/**
 * test
 * @param {MiddlewareParam} sofar
 */
async function handle(sofar) {
    //取得当前用户对象，其内部结构为：
    // {
    //     domain   //用户域
    //     openid   //用户标识
    //     sign     //用户令牌
    //     time     //标识令牌有效期的时间戳
    //     socket   //通讯句柄
    // }
    let user = sofar.socket.user;

    //取得当前上行消息
    let msg = sofar.msg;

    //下行信息给客户端，执行失败时需要借此通知错误信息：
    sofar.fn({ code: ReturnCode.userIllegal });

    //终止当前中间件以及所有后续中间件的执行：
    sofar.recy = false; 
    return;
}

//补充说明 - MiddlewareParam 定义如下：
const MiddlewareParam = {
    socket:null,    //通讯组件
    msg:{},         //消息
    fn: null,       //回调函数
    recy:true,      //中继标志：true 按顺序传递信息流到下一个中间件 false 终止传递
    facade: null    //门面对象，访问各种全局服务的界面
};
```

## 中间件的配置

中间件可以配置于各个控制器的 middleware 函数中，对输入流进行依序处理，例如：

```js
class test extends facade.Control {
    get middleware() {
        return ['parseParams', 'commonHandle'];
    }
}
```
如上代码指示对造访控制器test的信息流，依次应用 parseParams 和 commonHandle 这两个中间件进行处理

中间件的默认配置位于 CoreBase 类中：

```js
class CoreOfBase
{
    constructor($env) {
        //中间件设定，子类可覆盖
        this.middlewareSetting = {
            default: ['parseParams', 'commonHandle']
        };
    }
}
```