let facade = require('../../Facade')
let {PurchaseStatus, EntityType, IndexType} = facade.const
let BaseEntity = require('../BaseEntity')
let {BuyLog} = require('../table/BuyLog')

/**
 * 消费日志管理
 * 1. 以 id 为主键，以 trade_no 为 Domain 索引，以 third_no 为 Foreign 索引，以 domainid 为分组键
 */
class BuyLogEntity extends BaseEntity
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
                //返回内部系统订单号
                return this.orm.trade_no;

            case IndexType.Foreign:
                //返回外部系统订单号
                return this.orm.third_no;

            default:
                //返回主键值
                return this.orm.id;
        }
    }

    /**
     * 使用Mapping映射类时的配置参数
     */
    static get mapParams(){
        return {
            etype: EntityType.BuyLog,       //实体类型
            model: BuyLog,                  //对应数据库单表的ORM封装
            entity: BuyLogEntity,           //实体对象，在model之上做了多种业务封装
            group: 'domainid',              //分组键
        };
    }

    /**
     * 创建时的回调函数
     */
    static async onCreate(mysql, domainid, trade_no, product, product_desc, total_fee, fee_type) {
        try {
            let it = await BuyLog(mysql).create({
                'domainid': domainid,
                'trade_no': trade_no,
                'product': (typeof product == 'string' ? product : JSON.stringify(product)),
                'product_desc': product_desc,
                'total_fee': total_fee,
                'fee_type': fee_type,
                'result': PurchaseStatus.create,
            });
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
        let obj = new BuyLogEntity(record, core);
        return obj;
    }

    /**
     * 载入数据库记录时的回调函数
     * @param {*} mysql 
     * @param {*} callback 
     */
    static async onLoad(mysql, callback){
        try {
            let ret = await BuyLog(mysql).findAll();
            ret.map(it=>{
                callback(it);
            });
        } catch(e) {}
    }
    //endregion
}

exports = module.exports = BuyLogEntity;
