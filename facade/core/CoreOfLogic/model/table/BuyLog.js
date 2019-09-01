/**
 * Created by Administrator on 2017-03-21.
 */
var Sequelize = require('sequelize');
var conn = require('../../../../util/sequel');

//建立数据库ORM模型
let BuyLog = (mysql) => conn.seqConnector(mysql.db, mysql.sa, mysql.pwd, mysql.host, mysql.port).define('buylog', {
    third_no: Sequelize.STRING,             //外部订单编号，例如微信系统提供的订单号
    trade_no: Sequelize.STRING,             //内部订单编号，我方自行生成的符合一定编码规则的订单号
    domainid:Sequelize.STRING,              //用户唯一编码
    total_fee: Sequelize.BIGINT,            //订单金额，单位分
    fee_type: Sequelize.STRING,             //货币类型，默认 CNY
    product: Sequelize.STRING,              //商品内容 [{"type":"D","num":180}{"type":"D","num":180}]
    product_desc: Sequelize.STRING,         //商品描述
    result: Sequelize.SMALLINT,             //订单状态 0 生成 1 预付 2 支付 3 取消
    createdAt: {type: 'datetime'},          //创建时间
    updatedAt: {type: 'datetime'},          //更新时间
});

exports.BuyLog = BuyLog;

