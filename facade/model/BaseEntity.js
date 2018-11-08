let CoreOfBase = require('../core/CoreOfBase')

/**
 * 实体类基类
 */
class BaseEntity
{
    /**
     * 构造函数
     * @param {*} orm 
     * @param {CoreOfBase} router 
     */
    constructor(orm, router){
        this.orm = orm; //存储ORM对象
        this.router = router;
        this.dirty = false;
    }
    /**
     * 获取指定字段的原始数据
     * @param {*} field 
     */
    ormAttr(field){
        if(!!this.orm){
            return this.orm[field];
        }
        return null;
    }
    
    /**
     * 获取脏数据标志
     * @returns {*}
     */
    get dirty(){
        if(!this.isDirty){
            this.isDirty = false; //脏数据标志
        }
        return this.isDirty;
    }

    /**
     * 设置脏数据标志
     * @param val
     */
    set dirty(val){
        this.isDirty = val;
        if(this.isDirty){
            this.onUpdate();
        }
    }

    onUpdate(){
    }
}

exports = module.exports = BaseEntity