let facade = require('../../Facade')

/**
 * 网络连接监控任务对象
 * 在系统启动时，会创建一个唯一的网络连接监控对象，并持久保存在缓存列表中
 */
class connectMonitor
{
    constructor(){
        this.id = 'system.connect';  //特殊任务编号
    }

    /**
     * 执行逻辑。
     * @return
     *      true    ：状态失效，监控任务将被移出队列，不再接受检测
     *      false   ：状态有效，监控任务继续停留在队列中，接受后续检测
     */
    execute(fo){
        if(!!fo.service.server){ // 清理僵尸连接
            //console.log('网络连接定时检测');

            let cur = (new Date()).valueOf();
            Object.keys(fo.service.server.connected).map(it=>{
                let conn = fo.service.server.connected[it];
        
                if(!conn.user){
                    if(cur - conn.stamp > 10000) {
                        conn.disconnect(); //未登录连接，超时断开
                    }
                }
                else{
                    if(cur - conn.stamp > 600000) {
                        conn.disconnect(); //已登录连接，超时断开
                    }
                    else if(!!conn.user.tick){
                        conn.user.tick(); //固定时间间隔滴答一下
                    }
                }
            });
        
            //更新当前在线数
            fo.numOfOnline = Object.keys(fo.service.server.connected).length;
        }
        else{ //通讯服务异常，重启中...
            console.log('//通讯服务异常，15秒后重启...');
            setTimeout(()=>{
                process.exit(1);
            }, 15000);
            
            return true;
        }

        return false;
    }
}

module.exports = connectMonitor;