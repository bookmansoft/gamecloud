/**
 * 属性管理类的父类
 */
class baseAssistant
{
    /**
     * 构造函数
     * @param {UserEntity} parent 
     * @param {*} attribute 
     */
    constructor(parent, attribute){
        this.parent = parent;
        //用于持久化的字段名
        this.attribute = attribute;
        //存放需要持久化保存的属性的对象，存储时直接序列化该对象
        this.v = {};
    }

    /**
     * 获取一个特定类型的记录值
     * @param {*}  
     */
    GetRecord($type){
        return this.v[$type] || 0;
    }
    /**
     * 设置一个特定类型的记录值
     * @param {*}  
     * @param {*} val 
     */
    SetRecord($type, val){
        this.v[$type] = val || 0;
        this.dirty = true;
    }

    /**
     * 获取一个特定类型的记录值
     * @param {*}  
     */
    getAttr($type) {
        return this.v[$type] || 0;
    }
    /**
     * 设置一个特定类型的记录值
     * @param {*}  
     * @param {*} val 
     */
    setAttr($type, val){
        this.v[$type] = val || 0;
        this.dirty = true;
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

    /**
     * 获取归属用户实例
     * @return {UserEntity}
     */
    get parent(){
        return this.$parent;
    }
    /**
     * 设置归属用户实例
     * @param {UserEntity} val
     */
    set parent(val){
        this.$parent = val;
    }

    /**
     * 获取数据
     * @returns {{}|*}
     */
    GetData() {
        return this.v;
    }
    /**
     * 获取序列化字符串，同时复位脏数据标志
     * @note 子类可重载此方法
     */
    ToString(){
        this.dirty = false;
        return JSON.stringify(this.v);
    }
    /**
     * 利用来自持久化层的数据进行初始化
     * @note 子类可重载此方法 但此方法只是载入数值，所以无论如何不能引发 dirty 值的改变进而在载入阶段就引发数据库回写
     */
    LoadData (val) {
        try{
            this.v = (!val||val == "" ) ? {} : JSON.parse(val);
        }
        catch(e){
            //JSON解析失败
        }
    }

    onUpdate(){
        this.parent.core.notifyEvent('user.update', {user:this.parent});
    }
}

exports = module.exports = baseAssistant;
