let CoreOfBase = require('../core/CoreOfBase')

/**
 * 实体类基类
 */
class BaseEntity
{
    /**
     * 构造函数
     * @param {*}           orm     底层ORM对象 
     * @param {CoreOfBase}  core  节点对象
     */
    constructor(orm, core){
        this.orm = orm;
        this.core = core;
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
        if(this.isDirty) {
            this.onUpdate();
        }
    }

    /**
     * 读操作：ORM对象属性
     */
	getAttr(name) {
        return !!this.orm ? this.orm[name] : null;
	}

    /**
     * 写操作：ORM对象属性
     */
	setAttr(name, val) {
        if(!!this.orm){
            this.orm[name] = val;
            this.dirty = true;
        }
	}

    /**
     * 脏数据存储
     */
    Save() {
        if(this.dirty){
            this.dirty = false;
            this.orm.save().then(e=>{});
        }
    }

    /**
     * 更新记录
     */
    onUpdate() {
        this.Save();
    }

    /**
     * 索引值，用于配合Mapping类的索引/反向索引
     */
    IndexOf() {
        return this.orm.id;
    }

    /**
     * 删除记录
     * @param {*} entity 
     */
    static async onDelete(entity) {
    }
}

exports = module.exports = BaseEntity