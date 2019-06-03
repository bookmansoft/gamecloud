/**
/**
 * Created by liub on 2017-04-03.
 * 
 * 本文件为模板文件，请在本地复制一份并改名为 gameconfig.js (因含有敏感信息，请本地使用，不要上传) 
 */

/**
 * 统一的数据库连接串，如果不同服务器连接不同数据库，需要改写 config 中各个 mysql 字段
 */
let mysql = {
    "logging" : false,          //记录日志
    "db": "gamecloud",          //数据库名称    
    "sa": "dev",               //数据库用户名
    "pwd": "helloworld",        //数据库用户密码
    "host": "127.0.0.1",        //数据库服务器IP地址
    "port": 3306                //数据库服务器端口号
};

let redis = {
    "host": "127.0.0.1",
    "port": 6379,
    "opts": {}
};

let config = {
    "servers":{
        "Index":{
            "1":{
                "debug": true,              //本地测试模式
                "UrlHead": "http",          //协议选择: http/https
                "MaxConnection": 3000,      //最大并发连接
                "MaxRegister": 12000,       //单服最大注册用户数
                "PoolMax": 500,             //最大数据库并发连接
                "game_secret": "055c269fb1a866163c970d5b7f979f1c",
                "game_name": "鸡小德",
                "redis": redis,
                "mysql": mysql,
                "webserver": {
                    "mapping": "127.0.0.1",
                    "host": "127.0.0.1",
                    "port": 9901
                },
                "auth": {
                    "openid": "18681223392",
                    "openkey": "18681223392",
                    "domain": "tx.IOS",
                    "tokenExp": 600,
                    "sessionExp": 7200,
                    "pf": "wanba_ts"
                },
                "admin":{
                    "role":{
                        "default": "chick.server",
                        "system": "chick.server"
                    },
                    "game_secret": "055c269fb1a866163c970d5b7f979f1c"
                },
                "tx": {
                    "appid": "1105943531",
                    "appkey": "jzcfa29fmMS8F4J8&",
                    "pay_appid": "1450011656",
                    "pay_appkey": "l6LZfrwgKYO2KcJ6k6xAiZ5OqhMyIMNk&",
                    "reportApiUrl": "http://tencentlog.com",
                    "openApiUrl": "https://api.urlshare.cn",
                    "openApiUrlWithPay":"https://api.urlshare.cn"
                },
                "360":{
                    "appid":"203500811",
                    "game_key": "f075d0f4cab79b4df2ff690b4e0d96c4",
                    "game_secret": "055c269fb1a866163c970d5b7f979f1c"
                }
            }
        },
        "IOS":{
            "1":{
                "mysql": mysql,
                "webserver": {
                    "mapping": "127.0.0.1",
                    "host": "127.0.0.1",
                    "port": 9101
                }
            }
        }
    },
    /**
     * Application configuration section
     * http://pm2.keymetrics.io/docs/usage/application-declaration/
     */
    "apps" : [
        {
            "name"      : "Chick_IOS_1",
            "script"    : "facade/start.js",
            "cwd"         : "./",  // pm2运行目录相对main.js的路径
            //"out_file"   : "./logs/ios1/app-out.log",  // 普通日志路径
            "error_file" : "./logs/ios1/app-err.log",  // 错误日志路径
            "env": {
                "NODE_ENV": "production",
                "sys":{
                    "serverType": "IOS",
                    "serverId": 1,
                    "portal": true //指示该服务器兼任门户
                }
            }
        }
    ]
}

module.exports = config;