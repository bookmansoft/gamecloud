let facade = require('../../Facade')
let UserEntity = facade.entities.UserEntity

/**
 * 远程终端
 * Updated by liub on 2017-05-05.
 */
class Console extends facade.Control
{
    /**
     * 远程终端调用入口
     * @param {UserEntity} pUser 
     * @param {*} info 
     */
    async command(pUser, info){
        if(typeof info.data == "string"){
            info.data = JSON.parse(info.data);
        }
        if(typeof info.data == 'object' && info.data.length >= 1){
            let func = info.data.splice(0,1)[0];
            if(!!this[func]){
                if(this.parent.options.serverType == "Index"){ //Index首先收到了远程命令
                    let result = {};
                    if(info.data.length >= 2){ //如果指定了服务器，就只在该服务器上执行指令
                        let si = info.data.splice(0,2);
                        if(si[0] == "Index"){
                            result[`${si[0]}.${si[1]}`] = this[func](info.data);
                        }
                        else{
                            info.data.unshift(func);
                            result[`${si[0]}.${si[1]}`] = await this.parent.remoteCall('rpc', info.data, msg=>{return msg}, {stype:si[0], sid:si[1]});
                        }
                    }
                    else{ //否则，首先在所有逻辑服务器上执行指令，然后在Index上执行指令
                        info.data.unshift(func);
                        for(let stype of Object.keys(this.parent.serversInfo)) {
                            if(facade.CoreOfLogic.mapping.indexOf(stype) != -1) {
                                for(let sid of Object.keys(this.parent.serversInfo[stype])){
                                    result[`${stype}.${sid}`] = await this.parent.remoteCall('rpc', info.data, msg=>{return msg}, {stype:stype, sid:sid});
                                }
                            }
                        }
                        result['Index'] = this[func](info.data);
                    }
                    return result;
                }
                else{ //逻辑服收到了转发的远程命令
                    return this[func](info.data);
                }
            }
        }
    }

    /**
     * 可使用的控制台命令：屏显服务器信息
     */
    printInfo(param){
        if(this.parent.options.serverType == "Index"){//打印索引服连接对象信息
            let srvList = "";
            this.parent.service.servers.forServers(srv=>{
                srvList += `${srv.stype}.${srv.sid} `;
            });
            return `${this.parent.options.serverType}.${this.parent.options.serverId}: 连接数：${this.parent.numOfOnline},总注册：${this.parent.service.servers.getServerTotal()}, ${srvList}`;
        }
        else{//打印逻辑服在线数据
            return `Activity Users:${this.parent.service.activity.users.size}, ${this.parent.options.serverType}.${this.parent.options.serverId}: 连接数：${this.parent.numOfOnline},总注册：${this.parent.numOfTotal}`;
        }
    }

    /**
     * 可使用的控制台命令：强制保存全部用户信息
     */
    save(param){
        try{
            if(!!this.parent.service.io){
                //关闭WS接口，避免新的客户请求进入
                this.parent.service.io.close();
            }

            let self = this;
            function _save(){
                //保存所有用户数据
                if(!!self.parent.autoTaskMgr && self.parent.autoTaskMgr.checkTask() > 0){
                    setTimeout(()=>{
                        _save();
                    }, 100);
                }
                else{
                    console.log(`数据存储完成，${self.parent.options.serverType}.${self.parent.options.serverId}将在10秒后重启`);
                    setTimeout(()=>{
                        process.exit(1);
                    }, 10000);
                }
            }
            _save();

            return 0;
        }
        catch(e){
            console.error(e);
            return e;
        }
    }
}

exports = module.exports = Console;
