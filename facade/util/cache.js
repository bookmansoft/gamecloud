/**
 * 缓存管理类
 */
class cache {
    /**
     * 构造函数
     * 
     * @note
     *      当前假定客户端已经设定为自动断线重连
     * @param {*} parent 
     */
    constructor(parent){
        this.parent = parent;

        this.objects = new Map();       //键值对
        this.maps = new Map();          //集合列表，每个元素是一个Set
    }

    /**
     * KV读操作
     * @param {*} key   键   代表键的字符串
     * @return {Object} 值   代表值的对象，由返回字符串反序列化获得，失败返回null
     */
    get(key){
        if(key.constructor == Array){
            return key.reduce((sofar, cur)=>{
                if(this.objects.has(cur)){
                    sofar.push(JSON.parse(this.objects.get(cur).toString()));
                }
                return sofar;
            }, []);
        }
        else{
            if(this.objects.has(key)){
                return JSON.parse(this.objects.get(key).toString());
            }
            return null;
        }
    }

    /**
     * KV删除操作, 可通过传入数组进行批量删除
     * @param {*} key 
     */
    del(key, flag){
        if(key.constructor == Array){
            for(let it of key){
                this.objects.delete(it);
            }
        }
        else{
            this.objects.delete(it);
        }
    }

    /**
     * KV写操作，需在外围处理异常
     * 
     * @param {*} key       键   代表键的字符串
     * @param {*} value     值   代表值的字符串，写入前执行序列化操作
     */
    set(key, value){
        if(typeof value != "string"){
            value = JSON.stringify(value);
        }

        this.objects.set(key, Buffer.from(value));
    }

    /**
     * 集合：添加一个元素
     */
    groupAdd(sname, key){
        if(!this.maps.has(sname)){
            this.maps.set(sname, new Set());
        }
        this.maps.get(sname).add(key);
    }

    /**
     * 集合：删除一个或多个元素
     * 
     * @param {*} sname     集合的名称
     * @param {*} key       要删除的key，可以是包含多个要删除元素的数组
     */
    groupDel(sname, key){
        if(!sname || !key || !this.maps.has(sname)){
            return;
        }

        let st = this.maps.get(sname);
        if(key.constructor == Array){
            for(let k of key){
                st.delete(k);
            }
        }
        else{
            st.delete(key);
        }
        if(st.size == 0){
            this.maps.delete(sname);
        }
    }

    /**
     * 集合：查询并返回列表
     */
    groupKeys(sname){
        if(this.maps.has(sname)){
            return Array.from(this.maps.get(sname));
        }
        else{
            return [];
        }
    }
}

module.exports = cache;
