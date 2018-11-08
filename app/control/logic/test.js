let facade = require('../../../facade/Facade')
let {ReturnCode, NotifyType} = facade.const
/**
 * 部分测试流程
 * Updated by liub on 2017-05-05.
 */
class test extends facade.Control
{
    defaultFunc(user, objData){
        console.log('alice get it');
    }

    /**
     * 向消息发送者推送一条消息
     * @param user
     * @param objData
     * @returns {Promise.<void>}
     */
    async notify(user, objData) {
        user.notify({type: NotifyType.none, info:objData.msg});
    }

    async echo(user, objData) {
        return {code: ReturnCode.Success};
    }

    async sort(user, objData){
        let ret = [];
        for(let i=0;i<50000;i++){
            ret.push({id:i, score:i*5%50000});
        }
        console.time('sort');
        ret.sort((a,b)=>{return b.score - a.score});
        console.timeEnd('sort');
        return {code: ReturnCode.Success};
    }
}

exports = module.exports = test;
