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
  return db.createTable('login', {
    id: { type: 'int', primaryKey: true, autoIncrement: true},  
    uid: { type: 'int'},
    type: { type: 'int'},
    time: {type: 'string', length: 50},
  });
};

exports.down = function(db) {
  return db.dropTable('login').then(
    function(result) {
    },
    function(err) {
    }
  );
};

exports._meta = {
  "version": 1
};
