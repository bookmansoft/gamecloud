let facade = require('../../Facade')
let {EntityType, IndexType, ReturnCode} = facade.const

/**
 * 远程调用管理
 */
class rpc
{
    /**
     * 透传到Restful后台处理
     */
    async getUrl(url){
        try{
            return await new Promise((resolve,reject)=>{
                facade.getAsnyc.get(url).then(function(r){
                    resolve(r.body);
                }).catch(function(e){
                    reject(e);
                })
            });
        }
        catch(e){
            console.error(e);
        }
    }
}

exports = module.exports = rpc;
