let facade = require('../../../facade/Facade')
let {EntityType, UserStatus} = facade.const
let AllyObject = facade.EntityList.AllyObject

/**
 * VIP监控任务对象
 * 在系统启动时，会为所有VIP用户创建监控对象，然后定期监控用户VIP有效性，失效时返回true，此后该监控任务将被从列表中移除
 */
class allyAutoSave
{
    /**
     * 构造函数
     * @param {*}  监控对象ID
     */
    constructor($id){
        this.id = `ally.${$id}`;    //设置任务ID
        this.aid = $id;             //保存联盟ID
    }

    /**
     * 执行逻辑。
     * @return {Boolean} 
     *      true    ：状态失效，监控任务将被移出队列，不再接受检测
     *      false   ：状态有效，监控任务继续停留在队列中，接受后续检测
     */
    execute(fo){
        /**
         * @type {AllyObject}
         */
        let ao = facade.GetObject(EntityType.Ally, this.aid);
        if (!!ao) {
            if(ao.dirty){
                ao.Save();
            }
            return false;
        }
        return true;
    }
}

exports = module.exports = allyAutoSave;
