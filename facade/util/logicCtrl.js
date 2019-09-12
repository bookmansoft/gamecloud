let facade = require('../Facade')
let {EntityType, ReturnCode, IndexType} = facade.const

/**
 * Created by liub on 2017-03-26.
 */
class logicCtrl extends facade.Control
{
    /**
     * 索引服通知预注册
     * @param svr
     * @param obj
     */
    userPreLogin(svr, obj) {
        return this.core.entities.UserEntity.preLogin(obj.msg);
    }

    /**
     * 路由的社交消息
     * @param obj
     * @returns {number}
     */
    async userNotify(svr, obj) {
        /**
         * @type {UserEntity}
         */
        let ui = this.core.GetObject(EntityType.User, `${obj.msg.domain}.${obj.msg.openid}`, IndexType.Domain);
        if(!!ui) {
            this.core.notifyEvent('user.socialMsg', {user: ui, data: obj.msg.msg});
        }
    }

    /**
     * 可使用的控制台命令：屏显服务器信息
     */
    printInfo() {
        //打印逻辑服在线数据
        return `Activity Users:${this.core.service.activity.users.size}, ${this.core.options.serverType}.${this.core.options.serverId}: 连接数：${this.core.numOfOnline},总注册：${this.core.numOfTotal}`;
    }

    /**
     * 可使用的控制台命令：强制保存全部用户信息
     */
    save() {
        try {
            if(!!this.core.service.io) {
                //关闭WS接口，避免新的客户请求进入
                this.core.service.io.close();
            }

            let self = this;
            function _save() {
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
        } catch(e) {
            console.error(e);
            return e;
        }
    }
}

exports = module.exports = logicCtrl;
