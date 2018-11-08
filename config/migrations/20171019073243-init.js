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
  //设定最大连接数
  return db.runSql('set global max_connections=500;', ()=>{
    //创建存储过程 survive
    return db.runSql( 
      "CREATE PROCEDURE `survive` (IN `time` VARCHAR(50), OUT `r1` FLOAT, OUT `r3` FLOAT, OUT `r7` FLOAT) " +
      "BEGIN \n" +
      "  declare a int; \n" +
      "  declare b1 int; \n" +
      "  declare b3 int; \n" +
      "  declare b7 int; \n" +
      "  select count(id) into a from users where createdAt >= time and createdAt < DATE_ADD(time,INTERVAL 1 DAY); \n" +
      "  IF (a = 0) THEN \n" +
      "    set r1 = 0; \n" +
      "    set r3 = 0; \n" +
      "    set r7 = 0; \n" +
      "  ELSE \n" +
      "    select count(*) into b1 from login where type = 1 and uid in (select id from users where createdAt >= time and createdAt < DATE_ADD(time, INTERVAL 1 DAY)); \n" +
      "    select count(*) into b3 from login where type = 3 and uid in (select id from users where createdAt >= time and createdAt < DATE_ADD(time, INTERVAL 1 DAY)); \n" +
      "    select count(*) into b7 from login where type = 7 and uid in (select id from users where createdAt >= time and createdAt < DATE_ADD(time, INTERVAL 1 DAY)); \n" +
      "    set r1 = b1 / a; \n" +
      "    set r3 = b3 / a; \n" +
      "    set r7 = b7 / a; \n" +
      "  END IF; \n" +
      "  select r1, r3, r7; \n" +
      "END\n"
      , ()=>{});
  });
};

exports.down = function(db) {
  return db.runSql('DROP PROCEDURE IF EXISTS `survive`;', ()=>{});
};

exports._meta = {
  "version": 1
};
