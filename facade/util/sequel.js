/**
 * Created by Liub on 2017-03-09.
 *
 * @note: sequelize操作mysql数据库
 */
let env = !!process.env.sys ? JSON.parse(process.env.sys) : {serverType: "IOS", serverId: 1};
if(env.constructor == String){
    env = JSON.parse(env);
}

let serversInfo = require(`${process.cwd()}/gameconfig`).servers; //服务器配置管理
let sys = serversInfo[env.serverType][env.serverId];

var Sequelize = require('sequelize');

exports.seqConnector = (db, sa, pwd, host, port)=>{
    db = db || sys.mysql.db;
    sa = sa || sys.mysql.sa;
    pwd = pwd || sys.mysql.pwd;
    host = host || sys.mysql.host;
    port = port || sys.mysql.port;

    return new Sequelize(db, sa, pwd, {
        'dialectOptions': {
            //socketPath: "/var/run/mysqld/mysqld.sock",
            //useUTC: false //for reading from database
        },
        'timezone': '+08:00', //for writing to database
        'dialect': 'mysql',  // 数据库使用mysql
        'pool': {
            max: sys.PoolMax,
            min: 0,
            idle: 1000
        },
        'host': host, // 数据库服务器ip
        'port': port,        //数据库服务器端口
        'logging': false,  //是否关闭日志屏显
    });
}
