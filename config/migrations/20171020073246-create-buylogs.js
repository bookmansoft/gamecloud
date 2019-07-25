'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.createTable('buylogs', {
    id: { type: 'int', primaryKey: true, autoIncrement: true},  //日志编号
    domainid: {type: 'string', length: 128},                    //用户编号
    third_no: {type: 'string', length: 128},                    //外部系统订单编码
    trade_no: {type: 'string', length: 128, unique: true},      //内部系统订单编码
    total_fee: {type: 'string', length: 50},                    //总费用，单位为当前使用货币的最小单位，如 CNY 为分
    fee_type: {type: 'string', length: 50},                     //费用类型，默认 CNY
    product: {type: 'string', length: 128},                     //商品内容
    product_desc: {type: 'string', length: 255},                //商品描述
    result: {type: 'string', length: 50},                       //状态
    createdAt: {type: 'datetime'},                              //创建时间
    updatedAt: {type: 'datetime'},                              //更新时间
});
};

exports.down = function(db) {
  return db.dropTable('buylogs').then(
    function(result) {
    },
    function(err) {
    }
  );
};

exports._meta = {
  "version": 1
};
