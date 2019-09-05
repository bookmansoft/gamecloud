let facade = require('../../../Facade')
let {ReturnCode} = facade.const

/**
 * 配置管理器
 * Updated by liub on 2017-05-05.
 */
class config extends facade.Control 
{
    get middleware() {
        return ['parseParams', 'commonHandle'];
    }

    /**
     * 查询并返回配置文件
     * @param user
     * @param objData
     * @returns {Promise.<*>}
     */
    async get(user, objData) {
        try {
            if(!!this.core.fileMap[objData.file]) {
                return {code: ReturnCode.Success, data: this.core.fileMap[objData.file]};
            } else {
                return {code: ReturnCode.Error};
            }
        } catch(e) {
            console.error(e);
        }
    }

    get router() {
        return [
            [`/config`, 'getfile'], //通过标准 GET 方法获取配置文件
        ];
    }

    async getfile(objData) {
        return this.get(null, objData);
    }
}

exports = module.exports = config;
