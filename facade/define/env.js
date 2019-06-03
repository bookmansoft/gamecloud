/**
 * 服务器运行环境参数对象，此对象数据结构和 gameconfig.js 内部构造保持一致，多出的参数 serverType 和 serverId 为运行时自动注入
 */
const env = {
    serverType:"IOS",         //服务器类型
    serverId:1,               //服务器编号
    debug: true,              //本地测试模式
    UrlHead: "http",          //协议选择: http/https
    MaxConnection: 3000,      //最大并发连接
    MaxRegister: 12000,       //单服最大注册用户数
    PoolMax: 500,             //最大数据库并发连接
    game_secret: "",          //加密密钥
    game_name: "",         
    clientPath: "./client",
    adminPath: "./admin",
    redis: {
        host: "127.0.0.1",
        port: 6379,
        opts: {}
    },
    mysql: {
        logging : false,
        db: "",
        sa: "",
        pwd: "",
        host: "127.0.0.1",
        port: 3306
    },
    webserver: {
        mapping: "127.0.0.1",
        host: "127.0.0.1",
        port: 9901
    },
    auth: {
        openid: "555",
        openkey: "555",
        domain: "tx.IOS",
        tokenExp: 600,
        sessionExp: 7200,
        pf: "wanba_ts"
    },
    admin:{
        role:{
            default: "chick.server",
            system: "chick.server"
        },
        game_secret: ""
    },
    tx: {
        appid: "",
        appkey: "",
        pay_appid: "",
        pay_appkey: "",
        reportApiUrl: "",
        openApiUrl: "",
        openApiUrlWithPay:""
    },
    360:{
        appid:"",
        game_key: "",
        game_secret: ""
    }    
}

exports = module.exports = {
    env: env
}
