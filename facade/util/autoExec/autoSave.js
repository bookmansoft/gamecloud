let facade = require('../../Facade')
let {EntityType, UserStatus} = facade.const
let UserEntity = facade.entities.UserEntity

/**
 * UserEntity综合监控
 * 在系统启动时，会为VIP用户创建监控对象，后续还会为脏数据用户创建监控对象，然后就可以定期监控用户VIP有效性、脏数据等变化
 */
class autoSave
{
    /**
     * 构造函数
     * @param {*}  传入用户的id
     */
    constructor($id){
        this.id = `vip.${$id}`;     //设置任务ID
        this.uid = $id;             //保存用户ID
    }

    /**
     * 执行逻辑。
     * @return
     *      true    ：状态失效，监控任务将被移出队列，不再接受检测
     *      false   ：状态有效，监控任务继续停留在队列中，接受后续检测
     */
    execute(fo){
        let ret = true;

        /**
         * @type {UserEntity}
         */
        let user = facade.GetObject(EntityType.User, this.uid);
        if (!!user) {
            user.Save(); //脏数据检测&数据存储
        }
        return ret;
    }
}

exports = module.exports = autoSave;
