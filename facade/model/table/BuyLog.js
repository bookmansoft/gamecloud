/**
 * Created by Administrator on 2017-03-21.
 */
var Sequelize = require('sequelize');
var conn = require('../../util/sequel');

//建立数据库ORM模型
let BuyLog = (db, sa, pwd) => conn.seqConnector(db, sa, pwd).define('buylog', {
    trade_no: Sequelize.STRING,
    domain:Sequelize.STRING,
    uuid: Sequelize.STRING,
    product_id: Sequelize.STRING,
    total_fee: Sequelize.STRING,
    notify_time: Sequelize.STRING,
    product_name: Sequelize.STRING,
    request_count: Sequelize.STRING,
    result: Sequelize.STRING,
});

exports.BuyLog = BuyLog;

