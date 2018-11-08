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
  return db.createTable('ally_news', {
    id: { type: 'int', autoIncrement: true, primaryKey: true},
    aid: {type: 'int', defaultValue: 0},
    newstype: {type: 'int', defaultValue: 0},
    content: {type: 'string', length: 500},
    buildTime: {type: 'int', defaultValue: 0},
  });
};

exports.down = function(db) {
  return db.dropTable('ally_news').then(
    function(result) {
    },
    function(err) {
    }
  );
};

exports._meta = {
  "version": 1
};
