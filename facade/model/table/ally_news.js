/**
 * Created by Administrator on 2017-05-31.
 */
var Sequelize = require('sequelize');
var conn = require('../../util/sequel');

exports.ally_news = (mysql) => conn.seqConnector(mysql.db, mysql.sa, mysql.pwd, mysql.host, mysql.port).define(
	'ally_news', //默认表名。一般这里写单数，生成时会自动转换成复数形式
    {//主键、created_at、updated_at默认包含，不用特殊定义
        aid: Sequelize.INTEGER,
        newstype: Sequelize.INTEGER,
        content: Sequelize.STRING,
        buildTime: Sequelize.INTEGER,
    },
    {
        // 自定义表名
        'freezeTableName': true,
        'tableName': 'ally_news',
        // 是否需要增加createdAt、updatedAt、deletedAt字段
        'timestamps': false,
        // true表示删除数据时不会进行物理删除，而是设置deletedAt为当前时间
        'paranoid': false
    }
);
