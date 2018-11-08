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
    content: {type: 'string', length: 255},                     //日志内容
    time: {type: 'string', length: 50},                         //日志时间
    user: {type: 'string', length: 50},                         //用户唯一标识(openid)
    trade_no: {type: 'string', length: 50, unique: true},
    domain: {type: 'string', length: 50},
    uuid: {type: 'string', length: 50},
    product_id: {type: 'string', length: 50},
    total_fee: {type: 'string', length: 50},
    notify_time: {type: 'string', length: 50},
    product_name: {type: 'string', length: 50},
    request_count: {type: 'string', length: 50},
    result: {type: 'string', length: 50},
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
