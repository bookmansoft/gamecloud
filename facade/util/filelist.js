let fs = require("fs");
let path = require("path"); //path模块，可以生产相对和绝对路径

/**
 * 文件遍历工具类
 */
class Filelist
{
    /**
     * 遍历读取当前工作目录下子目录的所有文件，返回文件数组
     * @param {*} ori           相对路径
     * @param {Boolean} recy    遍历子目录
     */
    mapPath(ori, recy=true) {
        this.flist = [];
        return this.mapping(`${process.cwd()}/${ori}`, recy)
    }

    /**
     * 遍历读取相对目录下子目录的所有文件，返回文件数组
     * @param {*} ori           绝对路径
     * @param {*} recy          遍历子目录
     */
    mapPackagePath(ori, recy=true) {
        this.flist = [];
        return this.mapping(`${ori}`, recy)
    }

    /**
     * 遍历读取指定目录下所有文件，返回文件数组
     * @param {*} ori           绝对路径
     * @param {Boolean} recy    遍历子目录
     */
    mapping(ori, recy){
        return this.read(recy, ori);
    }

    read(recy, sofar, cname = "") {
        if(!fs.existsSync(sofar)) {
            return [];
        }

        let files = fs.readdirSync(sofar);
        if(!!files){
            files.forEach(filename => {
                if(filename !== '.gitkeeper') { //跳过占位符文件
                    let stats = fs.statSync(path.join(sofar, filename));
                    if(stats.isFile()) {
                        //判断调用者是否意图寻找特定文件
                        let _app = true;
                        if(typeof recy == 'object') {
                            if(!!recy.filename && recy.filename != filename) {
                                _app = false;
                            }
                        }
                        if(_app) {
                            this.flist.push({name: filename, path: path.join(sofar, filename), cname:cname});
                        }
                    } else if(stats.isDirectory()) {
                        let _recy = recy;
                        if(typeof recy == 'object') {
                            if(typeof recy.recy == 'boolean') {
                                _recy = recy.recy;
                            } else {
                                _recy = true;
                            }
                        }
                        if(_recy) {
                            this.read(recy, path.join(sofar, filename), !!cname ? `${cname}.${filename}` : filename);
                        }
                    }
                }
            });
        }

        return this.flist;
    }
}

exports = module.exports = new Filelist();
