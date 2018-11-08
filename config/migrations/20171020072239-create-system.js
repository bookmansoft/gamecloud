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
  return db.createTable('system', {
    id: { type: 'int', primaryKey: true, autoIncrement: true},  //唯一编号
    activity: {type: 'string', length: 500},
    dailyactivity: {type: 'string', length: 500},
  });
};

exports.down = function(db) {
  return db.dropTable('system').then(
    function(result) {
    },
    function(err) {
    }
  );
};

exports._meta = {
  "version": 1
};
