let config = {
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
    ],

    deploy : {
      production : {
        user : 'node',
        host : '127.0.0.1',
        ref  : 'origin/master',
        repo : 'git@github.com:gamecloud.git',
        path : '',
        'post-deploy' : 'npm install && pm2 reload gameconfig.js --env production'
      }
    }
}

module.exports = config;