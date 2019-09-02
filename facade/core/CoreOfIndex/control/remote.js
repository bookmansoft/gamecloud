let facade = require('../../../Facade')
let {ReturnCode} = facade.const
/**
 * Updated by liub on 2017-05-05.
 */
class remote extends facade.Control {
    get middleware(){
        return ['parseParams', 'authRemote', 'commonHandle'];
    }

    /**
     * 路由的社交消息
     * @param {*} svr 
     * @param {*} obj 
     */
    async userNotify(svr, obj){
        try{
            let sim = await this.core.getExcellentUser(obj.msg.openid); 
            if(!!sim){
                return await this.core.remoteCall('remote.userNotify', obj.msg, msg=>{return msg}, sim);
            }
        }
        catch(e){
            console.error(e);
        }
    }

    /**
    * 逻辑服请求注册
    * @param svr
    * @param obj
    */
    serverLogin(svr, obj) {
        if(!!this.core.serversInfo[svr.stype] && !!this.core.serversInfo[svr.stype][svr.sid]){
            this.core.service.servers.mapServer(svr);
            return {code: ReturnCode.Success};
        }
        //没有查找到对应的服务器信息，拒绝注册
        return {code: ReturnCode.illegalData};
    }

    /**
     * 模拟接口：提供模拟的好友列表
     * @param svr
     * @param input
     */
    getFriendList(svr, input){
        let items = [], ids=[];
        for(let obj of this.core.cacheMgr.objects){
            //console.log(obj[0]);
            let ui = this.core.cacheMgr.get(obj[0]);
            if(!!ui && !!ui.openid){
                ids.push(ui.openid);
            }

            if(ids.length > 10){
                break;
            }
        }
        //console.log(ids);

        for(let key of ids){
            if(input.msg.openid != key){
                items.push({openid:key});
            }
        }
        return {ret:0, items: items}
    }

    /**
     * 设置用户的相关信息
     * @param svr
     * @param envelope
     * @returns {{code: number}}
     */
    async newAttr(svr, envelope){
        let ui = await this.core.getUserIndex(envelope.msg.domain, envelope.msg.openid);
        if(!!ui && !!envelope.msg.attr){
            if(envelope.msg.attr.constructor == Array){ //一次修改多个属性
                envelope.msg.attr.map(item=>{
                    ui[item.type] = item.value;
                });
            }
            else{
                ui[envelope.msg.attr.type] = envelope.msg.attr.value;
            }
            await this.core.setUserIndex(ui);
        }
    }

    /**
     * 获取好友排行榜
     * @param svr
     * @param input
     * @returns {{code: number}}
     *
     * @note 如果多个分组都存在相关记录，取分数最高的记录
     */
    async getFriendRankList(svr, input){
        let uList = await this.core.getUserIndexOfAll(input.msg.list.reduce((sofar, cur) => {
            facade.CoreOfLogic.mapping.map(lt=>{
                sofar.push(`tx.${lt}.${cur.openid}`);
            });
            return sofar;
        }, [])); //需要查询的好友列表

        let list = []; //最终的查询结果
        input.msg.list.map(item => {
            let sim = null;
            facade.CoreOfLogic.mapping.map(lt=>{
                let u = uList[`tx.${lt}.${item.openid}`];
                if(!sim) {
                    sim = u;
                }
                if(!!sim && !!u) {
                    sim = u.score > sim.score ? u : sim;
                }
            });

            if(!!sim) {
                if(input.msg.filter){//有过滤数据的要求
                    if(sim.score > 0){
                        list.push(sim);
                    }
                }
                else{
                    list.push(sim);
                }
            }
        });
        return {code: ReturnCode.Success, data:{list: list}};
    }

    /**
     * 从逻辑服发起的、调用索引服上service功能的远程调用
     * @param {*} svr 
     * @param {*} obj 
     */
    async service(svr, obj){
        let msg = obj.msg;
        if(!!msg && !!this.core.service[msg.sname] && !!this.core.service[msg.sname][msg.sfunc]){
            return await this.core.service[msg.sname][msg.sfunc](...msg.params);
        }
    }
}

exports = module.exports = remote;
