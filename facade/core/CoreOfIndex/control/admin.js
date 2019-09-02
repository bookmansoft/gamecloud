let facade = require('../../../Facade')
let query = require('../../../util/mysql');

/**
 * 配置管理器
 * Updated by liub on 2017-05-05.
 */
class admin extends facade.Control {
    /**
     * 中间件设定
     */
    get middleware(){
        return ['parseParams', 'authAdmin', 'commonHandle'];
    }

    async login(user, objData)  {
        return {
            code: facade.const.ReturnCode.Success,
        }
    }

    async getRouteList(user, objData){
        return {
            code: facade.const.ReturnCode.Success,
            data: this.core.routeList()
        }
    }

    async addRoute(user, objData){
        if(!!objData.openid){
            this.core.testRoute.add(objData.openid);
        }
        return await this.getRouteList(user, objData);
    }

    /**
     * 获取服务器列表
     * @param user
     * @param objData
     * @returns {{code: number, data: *}}
     */
    getServerList(user, objData){
        return {
            code:facade.const.ReturnCode.Success,
            data:this.core.service.servers.forServers(srv=>{
                return `${srv.stype}.${srv.sid}`;
            }),
        };
    }

    async delRoute(user, objData){
        this.core.testRoute.delete(objData.openid);
        return await this.getRouteList(user, objData);
    }

    /**
     * 管理员查询汇总统计信息：总注册和总在线
     * @param user
     * @param objData
     * @returns {Promise.<{code: number, data: {totalUser: number, totalOnline: number}}>}
     */
    async summary(user, objData){
        try{
            if(!objData.server || objData.server == 'All'){
                return (await Promise.all(this.core.service.servers.forServers(async srv=>{
                    return await this.core.remoteCall("summary", {}, msg=>{return msg}, {stype:srv.stype, sid:srv.sid});
                }))).reduce((sofar, cur)=>{
                    sofar.data.totalUser += cur.data.totalUser;
                    sofar.data.totalOnline += cur.data.totalOnline;
                    sofar.data.totalAmount += cur.data.totalAmount;
                    return sofar;
                }, {code:facade.const.ReturnCode.Success, data:{totalUser:0, totalOnline:0, totalAmount: 0}});
            }
            else{
                let ps = objData.server.split('.');
                if(ps.length >= 2){
                    return {code:facade.const.ReturnCode.Success, data:(await this.core.remoteCall("summary", {}, msg=>{return msg}, {stype:ps[0], sid:parseInt(ps[1])})).data};
                }
                else{
                    return {code:facade.const.ReturnCode.Error};
                }
            }
        }
        catch(e){
            console.log(e);
            return {code:facade.const.ReturnCode.Error};
        }
    }

    /**
     * 留存率
     * @param user
     * @param objData
     * @returns {Promise.<{code: number, data: {first: number, third: number, seventh: number}}>}
     */
    async survive(user, objData){
        let ru = {code:facade.const.ReturnCode.Success, data:[]};
        (await Promise.all(this.core.service.servers.forServers(srv=>{
            let item = this.core.serversInfo[srv.stype][`${srv.sid}`];
            return new Promise(resolve=>{
                query(`call survive('${objData.time}',@r1,@r3,@r7)`, (err, vals)=>{
                    if(!err){
                        resolve({stype: srv.stype, sid: srv.sid, r1:(vals[0][0].r1*100)|0, r3:(vals[0][0].r3*100)|0, r7:(vals[0][0].r7*100)|0});
                    }
                    else{
                        resolve();
                    }
                }, {
                    host: item.mysql.host,
                    user: item.mysql.sa,
                    password: item.mysql.pwd,
                    database: item.mysql.db,
                    port: item.mysql.port
                });
            });
        }))).map(it=>{
            if(!!it){
                ru.data.push(it);
            }
        });
        return ru;
    }
}

exports = module.exports = admin;
