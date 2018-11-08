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
  return db.createTable('ally_object', {
    id: { type: 'int', autoIncrement: true, primaryKey: true},
    experience: {type: 'int', defaultValue: 0},
    uid: {type: 'int', defaultValue: 0},
    Name: {type: 'string', length: 50},
    Energy: {type: 'int', defaultValue: 0},
    Target: {type: 'int', defaultValue: 0},
    BattleGrade: {type: 'int', defaultValue: 0},
    aSetting: {type: 'int', defaultValue: 0},
    Users: {type: 'string', length:8000},
    sloganInner: {type: 'string', length: 500},
    sloganOuter: {type: 'string', length: 500}
  });
};

exports.down = function(db) {
  return db.dropTable('ally_object').then(
    function(result) {
    },
    function(err) {
    }
  );
};

exports._meta = {
  "version": 1
};
