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
  return db.createTable('m_player', {
    id: { type: 'int', primaryKey: true, autoIncrement: true},        //主键，本服内用户唯一编号
    domain: {type: 'string', length: 50, defaultValue: 'official'},   //联合外键
    uuid: {type: 'string', length: 50},                               //联合外键
    name: {type: 'string', length: 200},                        //姓名
    password: {type: 'string', length: 50},                     //密码
    activity: {type: 'string', length: 500},                    //活动
    dailyactivity: {type: 'string', length: 500},               //活动
    Tollgate: {type: 'string', length: 500},                    //副本信息
    login: {type: 'string', length: 200},                       //副本随机事件
    diamond: {type: 'int', defaultValue: 0},                    //钻石
    status: {type: 'int', defaultValue: 0},                     //复合状态，表示各类开启的特殊权限（不同于消息状态）
    refreshTime: {type: 'string', length: 50},                  //刷新时间，用于控制各类随时间增长的收益
    createdAt: {type: 'datetime'},                              //创建时间
    updatedAt: {type: 'datetime'},                              //更新时间
    score: {type: 'int', defaultValue: 0},
    setting: {type: 'string', length: 500}, 
    hisGateNo: {type: 'int', defaultValue: 1},
    role: {type: 'int', defaultValue: 1001},
    info: {type: 'string', length: 2000}, 
    pet: {type: 'string', length: 500}, 
    txinfo: {type: 'string', length: 500}, 
    txBule: {type: 'string', length: 500}, 
    item: {type: 'string', length: 500}, 
    vip: {type: 'string', length: 500}, 
    friend: {type: 'string', length: 500}, 
    task: {type: 'string', length: 500},                        //任务
    txFriend: {type: 'string', length: 500}, 
    execInfo: { type: 'string', length: 500},                   //行为限制信息存储字段
    pocket: { type: 'string', length: 500},                     //包裹序列化串存储字段
    shopInfo: { type: 'string', length: 2000},                  //商品属性列表、已购买纪录的缓存
    aid: { type: 'int', defaultValue: 0},                       //联盟ID
    invite: { type: 'string', length: 255},                     //申请、邀请记录
  }).then(
    function(result) {
      db.addIndex('m_player', 'domanId', ['domain', 'uuid'], true, (err, result)=>{});
    },
    function(err) {
    }
  );
};

exports.down = function(db) {
  return db.dropTable('m_player').then(
    function(result) {
    },
    function(err) {
    }
  );
};

exports._meta = {
  "version": 1
};

// {
//   CHAR: 'char',
//   STRING: 'string',
//   TEXT: 'text',
//   SMALLINT: 'smallint',
//   BIGINT: 'bigint',
//   INTEGER: 'int',
//   SMALL_INTEGER: 'smallint',
//   BIG_INTEGER: 'bigint',
//   REAL: 'real',
//   DATE: 'date',
//   DATE_TIME: 'datetime',
//   TIME: 'time',
//   BLOB: 'blob',
//   TIMESTAMP: 'timestamp',
//   BINARY: 'binary',
//   BOOLEAN: 'boolean',
//   DECIMAL: 'decimal'
// };

// type - the column data type. Supported types can be found in db-migrate-shared/data_type.js
// length - the column data length, where supported
// primaryKey - true to set the column as a primary key. Compound primary keys are supported by setting the  primaryKey option to true on multiple columns
// autoIncrement - true to mark the column as auto incrementing
// notNull - true to mark the column as non-nullable, omit it archive database default behavior and false to mark explicitly as nullable
// unique - true to add unique constraint to the column
// defaultValue - set the column default value. To set an expression (eg a function call) as the default value use this syntax: defaultValue: new String('uuid_generate_v4()')
// foreignKey - set a foreign key to the column