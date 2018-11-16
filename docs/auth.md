# 注册登录流程

## 基本流程描述

1. 向LBS(负载均衡服务)申请目标逻辑服地址

```js
let msg = await this.locate(
    host,   //LBS服务器地址
    port，  //LBS服务器端口
).fetching({"func": "config.getServerInfo", "oemInfo":{
        "domain": domain,   //用户验证域
        "openid": openid    //用户标识
    }});

if(!!msg && msg.code == ReturnCode.Success) {
    console.log(msg.data.ip, msg.data.port); //屏显获取的目标逻辑服地址
}
```

2. 向逻辑服申请登录令牌

```js
let authPage = 'auth.html';

let token = await this.locate(
    logicIp, 
    logicPort
).getRequest({id: openid, thirdUrl: authPage});

console.log(token);
```

@note 腾讯登录流程中，客户端是通过Runtime提前获取登录令牌、送至服务端进行远程校验，因此可以跳过此步骤


3. 将步骤2中获取的登录令牌(获取客户端提前获取的令牌)发送到逻辑服进行验证、登录(新用户自动注册)

```js
let msg = await this.fetching({
    'func': '1000',
    "oemInfo": {
        "domain": domain,    /*用户验证域*/
        "auth": token        /*登录令牌*/
    }
});

if(!!msg && msg.code == ReturnCode.Success && !!msg.data) {
    console.log(msg.data.id);
    console.log(msg.data.token);
}
```

## 内置验证类型

gamecloud 内置了四种验证类型，每种都有明确的预定义验证流程：
- official      默认验证流程
- 360           类360验证流程
- tx            类腾讯验证流程
- admin         管理者验证流程

注意：前述流程中 '用户验证域' 字段格式为 '验证类型.服务器类型'，其中服务器类型取值范围由 CoreOfLogic.mapping 指定， 例如 'official.IOS'

## 自定义验证流程

可以根据需要自行扩展更多的验证类型，并制定与之相应的验证流程:

1. 新增验证文件 /app/control/logic/authOfNew.js, 设置路由、撰写验证函数

```js
class authOfNew extends facade.Control
{
    get router(){
        return [
            ['/auth/new.html', 'auth'],
        ];
    }

    async auth(data) {
        //...
    }
```

2. 客户端调用流程

如下单元测试演示了如何发起验证请求：
```js
it('路由基准测试', async () => {
    await remote.login();
    let msg = await remote.fetching({thirdUrl: `auth/new.html`});
    console.log(msg);
});
```
