/**
 * Created by Administrator on 2017-03-21.
 */
var Sequelize = require('sequelize');
var conn = require('../../../../util/sequel');

//建立数据库ORM模型
let Mail = (mysql) => conn.seqConnector(mysql.db, mysql.sa, mysql.pwd, mysql.host, mysql.port).define(
    'Mail', 
    {
        src: Sequelize.STRING,
        dst: Sequelize.STRING,
        content: Sequelize.STRING,
        time: Sequelize.INTEGER,
        state: Sequelize.INTEGER,
        sn: Sequelize.STRING,
    },
    {
        // 是否需要增加createdAt、updatedAt、deletedAt字段
        'timestamps': false,
        // true表示删除数据时不会进行物理删除，而是设置deletedAt为当前时间
        'paranoid': false
    }
);
exports.Mail = Mail;