/**
 * 加载所有配置文件 - 注意校验新增的JSON配置文件的格式（特别是BOM），有可能载入错误导致运行异常
 * 
 */
let ini = require('./configMgr');
let filelist = require('../util/filelist');

exports.ini = ini;
exports.filelist = filelist;    //遍历目录工具
