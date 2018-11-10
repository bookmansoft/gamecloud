let facade = require('../../Facade')
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
            let sim = await this.parent.getExcellentUser(obj.msg.openid); 
            if(!!sim){
                return await this.parent.remoteCall('remote.userNotify', obj.msg, msg=>{return msg}, sim);
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
        if(!!this.parent.serversInfo[svr.stype] && !!this.parent.serversInfo[svr.stype][svr.sid]){
            this.parent.service.servers.mapServer(svr);
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
        for(let obj of this.parent.cacheMgr.objects){
            //console.log(obj[0]);
            let ui = this.parent.cacheMgr.get(obj[0]);
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
        let ui = await this.parent.getUserIndex(envelope.msg.domain, envelope.msg.openid);
        if(!!ui && !!envelope.msg.attr){
            if(envelope.msg.attr.constructor == Array){ //一次修改多个属性
                envelope.msg.attr.map(item=>{
                    ui[item.type] = item.value;
                });
            }
            else{
                ui[envelope.msg.attr.type] = envelope.msg.attr.value;
            }
            await this.parent.setUserIndex(ui);
        }
    }

    /**
     * 获取好友排行榜
     * @param svr
     * @param input
     * @returns {{code: number}}
     *
     * @note
     *      1、如果IOS、Android都有，那么取分数高的
     */
    async getFriendRankList(svr, input){
        let uList = await this.parent.getUserIndexOfAll(input.msg.list.reduce((sofar, cur)=>{
            sofar.push(`tx.IOS.${cur.openid}`);
            sofar.push(`tx.Android.${cur.openid}`);
            return sofar;
        }, [])); //需要查询的好友列表

        let list = []; //最终的查询结果
        input.msg.list.map(item=>{
            let sim = null;

            let u1 = uList[`tx.IOS.${item.openid}`];
            let u2 = uList[`tx.Android.${item.openid}`];

            if(!!u1 && !!u2){
                sim = u1.score > u2.score ? u1 : u2;
            }
            else if(!!u1){
                sim = u1;
            }
            else if(!!u2){
                sim = u2;
            }

            if(!!sim){
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
        if(!!msg && !!this.parent.service[msg.sname] && !!this.parent.service[msg.sname][msg.sfunc]){
            return await this.parent.service[msg.sname][msg.sfunc](...msg.params);
        }
    }
}

exports = module.exports = remote;
