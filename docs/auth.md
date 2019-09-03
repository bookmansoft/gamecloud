# 注册登录流程

## 基本流程描述

1. 向LBS(负载均衡服务)申请目标逻辑服地址

```js
let msg = await remote.locate(
    host,   //LBS服务器地址
    port，  //LBS服务器端口
).fetching({"func": "config.getServerInfo", "oemInfo": oemInfo});

if(!!msg && msg.code == ReturnCode.Success) {
    console.log(msg.data.ip, msg.data.port); //屏显获取的目标逻辑服地址
}
```

关于客户端上行字段oemInfo的说明
```json
{
    "domain"    : "用户验证域",
    "openid"    : "用户ID",
    "openkey"   : "和openid配套的认证令牌，用于单阶段登录模式",
    "auth"      : "两阶段登录模式下，服务端签发的登录签名集",
    "token"     : "两阶段登录模式下，服务端认证登录签名集后，发放的登录令牌",
}
```

2. 申请登录令牌

- 单阶段登录模式
单阶段登录模式下，客户端借助外部Runtime的帮助，提前获取了登录令牌，因此无需再向服务端提交申请

- 两阶段登录模式
两阶段登录模式下，客户端需要向服务端提交申请，获取登录令牌，如下所示：

```js
let authPage = 'auth.html';

let token = await remote.locate(
    logicIp, 
    logicPort
).getRequest({id: openid, thirdUrl: authPage});

console.log(token); //屏显获取的登录令牌
```

3. 将登录令牌发送到逻辑服进行验证、登录(新用户自动注册)

```js
let msg = await remote.fetching({
    'func': '1000',
    "oemInfo": oemInfo
});

if(!!msg && msg.code == ReturnCode.Success && !!msg.data) {
    console.log(msg.data.id);
    console.log(msg.data.token);
}
```

登录成功后，将在客户端连接器中形成完整的用户记录 ( remote.userInfo )

```json
{
    "domain"    : "客户端填写：用户验证域，指明验证类型和服务器类型",
    "openid"    : "客户端填写：用户标识，由客户端基于唯一标定原则生成",
    "openkey"   : "客户端填写：单阶段登录模式中，客户端预先获取的登录令牌",
    "pf"        : "客户端填写：附加信息，选填",
    "token"     : "服务端下发：经服务端验证后形成的登录凭证",
    "id"        : "服务端下发：经服务端验证后形成的用户识别码"
}
```

## 内置验证类型

gamecloud 内置了四种验证类型，每种都有明确的预定义验证流程：
- official      默认验证流程
- 360           类360验证流程
- tx            类腾讯验证流程
- admin         管理后台验证流程

注意：前述流程中 '用户验证域' 字段格式为 '验证类型.服务器类型'(例如 'official.IOS')，其中服务器类型取值范围由 CoreOfLogic.mapping 指定

## 自定义验证流程

可以根据需要自行扩展更多的验证类型，并制定与之相应的验证流程:

1. 新增验证文件 /app/control/CoreOfLogic/UserDefine.js, 撰写 UserDefine 类, "UserDefine" 将和 "360"、"tx" 一样，成为有效的验证类型

2. 为 UserDefine 类设置路由、撰写验证函数

```js
class authOfNew extends facade.Control
{
    get router() {
        return [
            ['/auth/new.html', 'auth'], //指定发放签名功能的路由、函数名
        ];
    }

    /**
     * 发放签名函数
     */
    async auth(data) {
        let auth = {
            t: now(),                         //当前时间戳，游戏方必须验证时间戳，暂定有效期为当前时间前后 5 分钟
            userId: objData.id,               //将客户端上行的平台用户 ID
        };
        auth.sign = sign(auth, facade.current.options['360'].game_secret);
        return auth;
    }

    /**
     * 验证签名函数，约定函数名必须为 check
     */
    async check(oemInfo) {
        let _sign = (oemInfo.auth.sign == facade.util.sign(oemInfo.auth, facade.current.options['360'].game_secret));
        let _exp = (Math.abs(oemInfo.auth.t - now()) <= 300);
        if (!_sign || !_exp) {
            throw new Error('authThirdPartFailed'); //未通过验证，抛出异常
        }

        return oemInfo.auth.userId; //通过验证后返回用户ID
    }
```

3. 通过客户端调用新的验证流程

```js
it('验证自定义验签流程', async () => {
    let msg = await remote.login({authControl: 'UserDefine'});
    console.log(msg);
});
```
