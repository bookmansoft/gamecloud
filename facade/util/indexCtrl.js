let facade = require('../Facade');
let {ReturnCode} = facade.const

/**
 * Created by liub on 2017-03-26.
 */
class indexCtrl extends facade.Control 
{
    async service(svr, obj) {
        let func = obj.msg.func.split('.');
        if(this.core.service[func[0]] && this.core.service[func[0]][func[1]]) {
            return this.core.service[func[0]][func[1]](...obj.msg.msg);
        } 
        return;
    }

    /**
     * 逻辑服发起、调用其他逻辑服的控制器方法
     * @param {*} svr   
     * @param {*} obj 
     */
    async routeCommand(svr, obj) {
        if(!obj.msg.si) {
            let domainId = `${obj.msg.domain}.${obj.msg.openid}`;
            let uList = await this.core.getUserIndexOfAll([domainId]);
            if(uList[domainId]) {
                return await this.core.remoteCall(obj.msg.func, obj.msg, msg=>{return msg}, uList[domainId]);
            }
        } else {
            if(!obj.msg.si.sid) {
                let result = {};
                for(let sid of Object.keys(this.core.serversInfo[obj.msg.si.stype])) {
                    result[`${obj.msg.si.stype}.${sid}`] = await this.core.remoteCall(obj.msg.func, obj.msg.msg, msg=>{return msg}, {stype:obj.msg.si.stype, sid:sid});
                }
                return result;
            } else {
                return await this.core.remoteCall(obj.msg.func, obj.msg.msg, msg=>{return msg}, obj.msg.si);
            }
        }
    }
    
    /**
     * 索引服发起、调用索引服本身或逻辑服的控制器方法
     * @param {*} svr   
     * @param {*} info 
     */
    async command(svr, info) {
        if(typeof info.data == "string"){
            info.data = JSON.parse(info.data);
        }
        if(typeof info.data == 'object' && info.data.length >= 1){
            let func = info.data.splice(0,1)[0];
            if(!!this[func]){
                let result = {};
                if(info.data.length >= 2) { 
                    //如果指定了服务器，就只在该服务器上执行指令
                    let si = info.data.splice(0,2);
                    if(si[0] == "Index"){
                        result[`${si[0]}.${si[1]}`] = this[func](info.data);
                    } else {
                        info.data.unshift(func);
                        if(!!si[1]) {
                            for(let sid of Object.keys(this.core.serversInfo[si[0]])) {
                                result[`${si[0]}.${sid}`] = await this.core.remoteCall(func, info.data, msg=>{return msg}, {stype:si[0], sid:sid});
                            }
                        } else {
                            result[`${si[0]}.${si[1]}`] = await this.core.remoteCall(func, info.data, msg=>{return msg}, {stype:si[0], sid:si[1]});
                        }
                    }
                } else { 
                    //否则，首先在所有逻辑服务器上执行指令，然后在Index上执行指令
                    info.data.unshift(func);
                    for(let stype of Object.keys(this.core.serversInfo)) {
                        if(stype != "Index") {
                            for(let sid of Object.keys(this.core.serversInfo[stype])) {
                                result[`${stype}.${sid}`] = await this.core.remoteCall(func, info.data, msg=>{return msg}, {stype:stype, sid:sid});
                            }
                        }
                    }
                    result['Index'] = this[func](info.data);
                }
                return result;
            }
        }
    }

    /**
     * 可使用的控制台命令：屏显服务器信息
     */
    printInfo(param) {
        //打印索引服连接对象信息
        let srvList = "";
        this.core.service.servers.forServers(srv=>{
            srvList += `${srv.stype}.${srv.sid} `;
        });
        return `${this.core.options.serverType}.${this.core.options.serverId}: 连接数：${this.core.numOfOnline},总注册：${this.core.service.servers.getServerTotal()}, ${srvList}`;
    }

    /**
     * 模拟接口：提供模拟的好友列表
     * @param svr
     * @param input
     */
    getFriendList(svr, input) {
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
    async newAttr(svr, envelope) {
        let ui = await this.core.getUserIndex(envelope.msg.domain, envelope.msg.openid, {sid:svr.sid});
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
    async getFriendRankList(svr, input) {
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
}

exports = module.exports = indexCtrl;
