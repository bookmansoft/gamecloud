/**
 * Created by Administrator on 2017-03-21.
 */
var Sequelize = require('sequelize');
var conn = require('../../util/sequel');

//建立数据库ORM模型
let ally = (mysql) => conn.seqConnector(mysql.db, mysql.sa, mysql.pwd, mysql.host, mysql.port).define(
    'ally', 
    {
        experience: Sequelize.INTEGER,
        uid: Sequelize.INTEGER,
        Name: Sequelize.STRING,
        Energy: Sequelize.INTEGER,
        Target: Sequelize.INTEGER,
        BattleGrade: Sequelize.INTEGER,
        aSetting: Sequelize.INTEGER,
        Users: Sequelize.STRING,
        sloganInner: Sequelize.STRING,
        sloganOuter: Sequelize.STRING,
    },
    {
        // 自定义表名
        'freezeTableName': true,
        'tableName': 'ally_object',
        // 是否需要增加createdAt、updatedAt、deletedAt字段
        'timestamps': false,
        // true表示删除数据时不会进行物理删除，而是设置deletedAt为当前时间
        'paranoid': false
    }
);

exports.ally = ally;
