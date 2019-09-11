let facade = require('../../../Facade')

/**
 * 远程终端
 * Updated by liub on 2017-05-05.
 */
class Console extends facade.Control
{
    /**
     * 可使用的控制台命令：屏显服务器信息
     */
    printInfo(param){
        if(this.core.options.serverType == "Index"){//打印索引服连接对象信息
            let srvList = "";
            this.core.service.servers.forServers(srv=>{
                srvList += `${srv.stype}.${srv.sid} `;
            });
            return `${this.core.options.serverType}.${this.core.options.serverId}: 连接数：${this.core.numOfOnline},总注册：${this.core.service.servers.getServerTotal()}, ${srvList}`;
        }
        else{//打印逻辑服在线数据
            return `Activity Users:${this.core.service.activity.users.size}, ${this.core.options.serverType}.${this.core.options.serverId}: 连接数：${this.core.numOfOnline},总注册：${this.core.numOfTotal}`;
        }
    }

    /**
     * 可使用的控制台命令：强制保存全部用户信息
     */
    save(param){
        try{
            if(!!this.core.service.io){
                //关闭WS接口，避免新的客户请求进入
                this.core.service.io.close();
            }

            let self = this;
            function _save(){
                //保存所有用户数据
                if(!!self.core.autoTaskMgr && self.core.autoTaskMgr.checkTask() > 0){
                    setTimeout(()=>{
                        _save();
                    }, 100);
                }
                else{
                    console.log(`数据存储完成，${self.core.options.serverType}.${self.core.options.serverId}将在10秒后重启`);
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
