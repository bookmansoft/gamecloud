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
};

exports.down = function(db) {
  return db.removeColumn('m_player', 'potential')           
};

exports._meta = {
  "version": 1
};

//region 部分语法示例：

//addColumn('m_player', 'test', { type: 'string', length: 200});})
//renameColumn('m_player', 'test', 'tested')
//changeColumn('m_player', 'tested', { type: 'string', length: 300})
//removeColumn('m_player', 'tested');})

//endregion