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
  return db.createTable('activity', {
    id: { type: 'int', primaryKey: true, autoIncrement: true},  //唯一编号
    lastTime: {type: 'string', length: 50, unique: true},       //
    content: {type: 'string', length: 2000},                    //
    status: {type: 'int', defaultValue: 0},                     //
    createdAt: {type: 'datetime'},                              //创建时间
    updatedAt: {type: 'datetime'},                              //更新时间
  });
};

exports.down = function(db) {
  return db.dropTable('activity').then(
    function(result) {
    },
    function(err) {
    }
  );
};

exports._meta = {
  "version": 1
};
