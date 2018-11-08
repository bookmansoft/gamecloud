let um = require('./updateMgr');

/**
 * 通用监控对象
 * 在系统启动时，会创建一个唯一的监控对象，并持久保存在缓存列表中
 */
class commonMonitor
{
    /**
     * 可以直接传入闭包，也可以传入对象或者类(interface.RunMonitor)
     * @param {*} cls 
     */
    constructor(cls){
        if(!!cls.name){
            this.id = `system.${cls.name}`;  //特殊任务编号
        }
        else {
            this.id = `system.${(Math.random()*10000000)|0}`;  //特殊任务编号
        }
        this.cls = cls;
    }

    /**
     * 执行逻辑
     * @param {CoreOfBase} fo
     * @return
     *      true    ：状态失效，监控任务将被移出队列，不再接受检测
     *      false   ：状态有效，监控任务继续停留在队列中，接受后续检测
     */
    execute(fo){
        if(!!this.cls){
            if(!!this.cls.RunMonitor && this.cls.RunMonitor.constructor == Function){
                return this.cls.RunMonitor(fo);
            }
            else if(this.cls.constructor == Function){
                return this.cls(fo);
            }
        }
        return true;
    }
}

/**
 * 自动任务管理器，目前只支持同步任务
 */
class AutoTaskManager
{
    /**
     * 构造函数
     * @param {CoreOfBase} parent    核心对象
     */
    constructor(parent){
        this.parent = parent; //注入核心对象

        //延期自动执行任务的缓存列表
        this.updateRecord = {};

        //持续监控任务的缓存列表
        this.monitorRecord = {};

        //tick检测
        let self = this;
        (new um(1000)).tick(0, ()=>{ //每秒检测一次、持续不断
            self.checkTask.apply(self);
        });
    }

    /**
     * 添加一个自动任务，延迟执行后自动销毁
     * @param {*} task          任务对象
     * @param {Number} delay    延迟时间，单位毫秒，默认30s
     * 应用场景：
     *      1、实体对象的延迟写。例如在user数据变化时添加一个自动任务，一定时间内发生的多个自动任务会合并为同一个条目
     * @note 
     *      id相同的自动任务会相互覆盖
     */
    addTask(task, delay=30000){
        if(!this.updateRecord[task.id]){
            task.$taskTime = new um(delay);
            this.updateRecord[task.id] = task;
        }
    }

    /**
     * 添加一个监视器，定期进行状态检测，当状态失效时退出监视、销毁监视器
     * @note 
     *      id相同的监控器会相互覆盖
     * @param {*} monitor       监视器对象或者闭包
     * @param {Number} recy     检测周期，单位毫秒，默认30秒
     */
    addMonitor(monitor, recy=30000){
        if(!this.monitorRecord[monitor.id]){
            monitor.$taskTime = new um(recy);
            this.monitorRecord[monitor.id] = monitor;
        }
    }

    addCommonMonitor(func, recy=30000){
        this.addMonitor(new commonMonitor(func), recy);
    }

    /**
     * tick事件句柄
     */
    checkTask() {
        try{
            let curTime = (new Date()).valueOf();
            let facade = this.parent;
            
            //检测监视器状态，当状态失效时，就从监控列表中删除
            for(let id of Object.keys(this.monitorRecord)){
                if(this.monitorRecord[id].$taskTime.check()){ //监控周期时间检测
                    if(this.monitorRecord[id].execute(facade)){
                        delete this.monitorRecord[id];
                    }
                }
            }

            //执行自动任务，其主要目的是在延迟期内合并一系列同类任务，以降低IO压力
            let recy = facade.options.PoolMax / 2; //控制并发数量的循环变量
            for(let id of Object.keys(this.updateRecord)){
                if(recy > 0){//并发控制检测
                    if(this.updateRecord[id].$taskTime.check()) {//延迟时间检测
                        recy--;                                 //并发数量减1
                        this.updateRecord[id].execute(facade);  //执行自动任务
                        delete this.updateRecord[id];           //删除自动任务
                    }
                }
            }
            //在系统关闭前必须反复调用checkTask，直至列表尺寸为0，以保证所有自动任务得以执行
            return Object.keys(this.updateRecord).length;
        }
        catch(e){
            console.error(e);
        }
    }
}

module.exports = AutoTaskManager;