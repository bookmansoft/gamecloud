/**
 * 加载所有配置文件 - 注意校验新增的JSON配置文件的格式（特别是BOM），有可能载入错误导致运行异常
 * 
 */
let ini = require('./configMgr');
let filelist = require('../util/filelist');
let fileMap = {};
for(let fl of filelist.mapPath('/config/data')) {
    let id = fl.name.split('.')[0];
    fileMap[id] = ini.get(fl.path).GetInfo();
}

exports.fileMap = fileMap;      //文件索引表
exports.filelist = filelist;    //遍历目录工具
