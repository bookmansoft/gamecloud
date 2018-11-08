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
  return db.addColumn('m_player', 'potential', { type: 'string', length: 2000})           //法宝序列化串存储字段
  .then(result=>{db.addColumn('m_player', 'execInfo', { type: 'string', length: 500});})  //行为限制信息存储字段
  .then(result=>{db.addColumn('m_player', 'pocket', { type: 'string', length: 500});})    //包裹序列化串存储字段
  .then(result=>{db.addColumn('m_player', 'shopInfo', { type: 'string', length: 2000});}) //商品属性列表、已购买纪录的缓存
  .then(result=>{db.addColumn('m_player', 'aid', { type: 'int', defaultValue: 0});})      //联盟ID
  .then(result=>{db.addColumn('m_player', 'invite', { type: 'string', length: 255});})    //申请、邀请记录
};

exports.down = function(db) {
  return db.removeColumn('m_player', 'potential')           
  .then(result=>{db.removeColumn('m_player', 'execInfo');})  
  .then(result=>{db.removeColumn('m_player', 'pocket');})  
  .then(result=>{db.removeColumn('m_player', 'rank');})  
  .then(result=>{db.removeColumn('m_player', 'shopInfo');})  
  .then(result=>{db.removeColumn('m_player', 'aid');})  
  .then(result=>{db.removeColumn('m_player', 'invite');})  
};

exports._meta = {
  "version": 1
};

//addColumn('m_player', 'test', { type: 'string', length: 200});})
//renameColumn('m_player', 'test', 'tested')
//changeColumn('m_player', 'tested', { type: 'string', length: 300})
//removeColumn('m_player', 'tested');})
