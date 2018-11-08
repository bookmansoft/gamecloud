/**
 * Created by Administrator on 2017-05-30.
 */
let mysql = require("mysql");
let pool = null;

let query = function(sql, callback, params){
    if(!pool){
        pool = mysql.createPool(params);
    }
    pool.getConnection((err,conn) => {
        if(err){
            callback(err,null,null);
        }else{
            conn.query(sql, (err, vals, fields) => {
                //释放连接
                conn.release();
                //事件驱动回调
                callback(err, vals, fields);
            });
        }
    });
};

module.exports = query;