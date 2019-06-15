let facade = require('../../../facade/Facade')
let {PurchaseStatus, EntityType, IndexType} = facade.const
let BaseEntity = require('../BaseEntity')
let {BuyLog} = require('../table/BuyLog')

/**
 * 日志管理
 */
class log extends BaseEntity
{
    constructor(orm, core){
        super(orm, core);
    }

    //region 集合功能

    /**
     * 索引值，用于配合Mapping类的索引/反向索引
     */
    IndexOf(type){
        switch(type){
            case IndexType.Domain:
                return this.orm.trade_no;

            default:
                return this.orm.id;
        }
    }

    /**
     * 使用Mapping映射类时的配置参数
     */
    static get mapParams(){
        return {
            model: BuyLog,                  //对应数据库单表的ORM封装
            entity: log,                    //实体对象，在model之上做了多种业务封装
            etype: EntityType.BuyLog,       //实体类型
            group: 'user',                  //分组键
        };
    }

    /**
     * 创建时的回调函数
     */
    static async onCreate(domain, uuid, product_id, total_fee, notify_time, product_name, request_count) {
        try {
            let it = await BuyLog().create({
                'domain':domain,
                'uuid':uuid,
                'product_id': (product_id.constructor == String ? product_id : JSON.stringify(product_id)),
                'total_fee':total_fee,
                'notify_time':notify_time,
                'product_name':product_name,
                'request_count':request_count,
                'result': PurchaseStatus.create,
            });
            it.trade_no = `BX${domain}${uuid}`;
            await it.save();
    
            return it;
        } catch(e) {
            console.error(e);
        }
        return null;
    }

    /**
     * 进行字典映射时的回调函数
     * @param {*} record 
     */
    static onMapping(record, core) {
        let obj = new log(record, core);
        return obj;
    }

    /**
     * 载入数据库记录时的回调函数
     * @param {*} db 
     * @param {*} sa 
     * @param {*} pwd 
     * @param {*} callback 
     */
    static async onLoad(db, sa, pwd, callback){
        try {
            let ret = await BuyLog(db, sa, pwd).findAll();
            ret.map(it=>{
                callback(it);
            });
        } catch(e) {}
    }
    //endregion
}

exports = module.exports = log;
