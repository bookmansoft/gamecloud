Array.prototype.array_diff = function(...params){
    return this.reduce((sofar,cur)=>{
        let find = false;
        for(let i=0;i<params.length;i++){
            if(params[i].indexOf(cur) != -1){
                find = true;
            }
        }
        if(!find){
            sofar.push(cur);
        }
        return sofar;
    },[]);
}

/**
 * 安全读取属性函数，兼容 BaseEntity 类(ORM 封装类)
 * @param {*} obj       对象
 * @param {*} attr      属性名称
 */
function GetAttr(obj, attr) {
    if(!!obj) {
        if(typeof obj.attr == 'undefined' && typeof obj.getAttr == 'function') {
            return obj.getAttr(attr);
        }
    }

    return null;
}

/**
 * 集合类，类似PHP中的Collection
 */
class Collection
{
    /**
     * 构造函数
     * @param {*} val 二维数组表示的待载入数据集，形如 [[k1,v1],[k2,v2],...]
     */
    constructor(val){
        this.data = new Map();

        if(!!val){
            this.load(val);
        }

        this.$dirty = true;
    }

    /**
     * 综合查询, 现在支持聚合语法，例如 ['@total','price'] 可以查询总价
     * @param {[[]]}    query 
     * @param {[]}      order [attr, mode]
     */
    query(query, order) {
        let size = 10;
        let page = 1;
        let $amount = [];

        for(let i = 0; i < query.length; i++) {
            let item = query[i];

            if(!item || !Array.isArray(item)) {
                delete query[i];
                continue;
            }

            if(item[0] == 'size') {
                size = item[1];
                delete query[i];
                continue;
            }

            if(item[0] == 'page') {
                page = item[1];
                delete query[i];
                continue;
            }

            //聚合字段
            if(item[0] == '@total' || item[0] == '@sum') {
                $amount.push(['sum', item[1]]);     //记录聚合字段
                size = 0xffffffff;                  //将页尺寸调为无穷大
                delete query[i];
                continue;
            } else if(item[0] == '@max') {
                $amount.push(['max', item[1]]);     //记录聚合字段
                size = 0xffffffff;                  //将页尺寸调为无穷大
                delete query[i];
                continue;
            } else if(item[0] == '@min') {
                $amount.push(['min', item[1]]);     //记录聚合字段
                size = 0xffffffff;                  //将页尺寸调为无穷大
                delete query[i];
                continue;
            }
             else if(item[0] == '@average') {
                $amount.push(['average', item[1]]); //记录聚合字段
                size = 0xffffffff;                  //将页尺寸调为无穷大
                delete query[i];
                continue;
            }
        }
        let master = this;

        let rt = master.where(query);
        if(Array.isArray(order) && order.length > 2) {
            rt = rt.orderby(order[0], order[1]);
        }
        return rt.paginate(size, page, $amount).result();
    }

    /**
     * 数据集需要更新标志
     */
    get dirty() {
        return this.$dirty;
    }
    set dirty(val) {
        this.$dirty = val;
    }
    /**
     * 返回查询结果
     * @param {Array} attrs 字段筛选
     */
    result(attrs) {
        let ret = {
            list: this.records(),       //条目列表，当使用聚合函数时为空
            count: this.count,          //总条目数
            page: this.pageNum,         //总页数
            cur: this.pageCur,          //当前页码
            countCur: this.countCur     //当前页条目数
        };
        if(Array.isArray(this.attrs)) {
            this.attrs.map(attr=>{
                ret[attr[1]] = this[attr[1]];
            });
        }
        return ret;
    }

    /**
     * 根据传入的 pre 函数进行筛选
     * @param {*} pre 
     */
    async predict(pre) {
        let ret = [...this.data];
        let result = [];
        for(let [k, v] of ret) {
            if(await pre(k, v)) {
                result.push([k,v]);
            }
        }
        return new Collection(result);
    }

    deletes(conditions) {
        let ls = this.where(conditions).getKeys();
        for(let key of ls) {
            this.data.delete(key);
        }
        this.items = null;
    }

    clear() {
        this.data.clear();
        this.items = null;
    }


    getKeys() {
        return [...this.data.keys()];
    }

    getSize(){
        return this.data.size;
    }

    /**
     * 查询传入的ID集合中，本地存储中不存在的ID，返回其集合
     * @param {Array} ids       ID集合 
     */
    excludeCids(ids) {
        ids = ids || [];
        if(!Array.isArray(ids)){
            return [];
        }

        ids = Array.from(new Set(ids)); //去重
        return ids.reduce((sofar, cur) => {
            if(!this.has(cur)){
                sofar.push(cur);
            }
            return sofar;
        }, []);
    }

    /**
     * 排序并缓存排序结果，支持链式操作
     * @param {*} attr 
     * @param {*} mode 
     */
    orderby(attr, mode){
        if(!this.items){
            this.items = this.ToArray();
        }

        switch(mode){
            case 'desc':
                this.items = this.items.sort((a,b)=>{
                    return GetAttr(b, attr) - GetAttr(a, attr);
                });
                break;
            case 'asc':
                this.items = this.items.sort((a,b)=>{
                    return GetAttr(a, attr) - GetAttr(b, attr);
                });
                break;
        }
        return this;
    }

    /**
     * 设定分页参数
     * @param {*} pageSize  每页包含的条目数
     * @param {*} current   当前页码 base 1
     * @param {Array} attrs 聚合属性
     */
    paginate(pageSize, current, attrs){
        if(!this.items){
            this.items = this.ToArray();
        }

        if(!current){
            current = 1;
        }
        this.pageSize = pageSize;
        if(this.items.length % this.pageSize == 0){
            this.pageNum = (this.items.length / this.pageSize) | 0;
        }
        else{
            this.pageNum = ((this.items.length / this.pageSize) | 0) + 1;
        }
        this.pageCur = Math.max(1,Math.min(this.pageNum, current));
        this.attrs = attrs;
        this.count = this.items.length;

        return this;
    }

    /**
     * 获取当前分页内容
     * @param {Array} attrs 属性选择
     */
    records(attrs){
        if(!this.items){
            this.items = this.ToArray();
        }

        if(this.items.length == 0){
            return [];
        }

        if(!this.pageSize){
            this.pageSize = this.items.length;
            this.pageNum = 1;
            this.pageCur = 1;
        }

        if(!!attrs){
            this.attrs = attrs;
        }

        let $pageItems = [];

        if(this.pageCur > this.pageNum) {
            return $pageItems;
        }

        this.countCur = 0;
        let self = this;
        for(let i = this.pageSize*(this.pageCur-1); i<this.pageSize*this.pageCur; i++){
            if(!this.items[i]){
                break;
            }

            this.countCur++;

            //属性选择
            let it = null;
            if(Array.isArray(attrs)) {
                it = attrs.reduce((sofar,cur) => {
                    sofar[cur] = GetAttr(self.items[i], cur);
                    return sofar;
                }, {});
            }
            else{
                it = this.items[i];
            }

            //计算聚合函数
            if(Array.isArray(this.attrs) && this.attrs.length > 0) {
                this.attrs.map(attr => {
                    self[attr[1]] = self[attr[1]] || null;

                    let val = null;
                    let ks = attr[1].split('.');
                    for(let k of ks) {
                        if(!val) {
                            val = self.items[i][k];
                        } else {
                            val = val[k];
                        }
    
                        if(typeof val == 'undefined') {
                            break;
                        }
                    }
                    if(!!val) {
                        switch(attr[0]) {
                            case 'sum': {
                                if(!self[attr[1]]) {
                                    self[attr[1]] = 0;
                                }
                                self[attr[1]] += val;
                                break;
                            }
                            case 'max': {
                                if(!self[attr[1]] || self[attr[1]] < val) {
                                    self[attr[1]] = val;
                                }
                                break;
                            }
                            case 'min': {
                                if(!self[attr[1]] || self[attr[1]] > val) {
                                    self[attr[1]] = val;
                                }
                                break;
                            }
                        }
                    }
                });
            } else {
                $pageItems.push(it);

            }
        }

        return $pageItems;
    }    

    /**
     * 条件筛选
     * @param {*} assert 二维数组表示的判断条件，形如 [[attr,sign,val],...]
     */
    where(conditions){
        let ret = [...this.data];
        for(let cond of conditions){
            if(!cond || !Array.isArray(cond) || cond.length < 2) {
                continue;
            }
    
            let $c = {k:cond[0], sign:cond.length==2 ? '==' : cond[1], v:cond.length==2 ? cond[1] : cond[2]};
            if(!$c.k || typeof $c.v == 'undefined') {
                continue;
            }

            ret = ret.filter(([k,v]) => {
                let val = null;

                let ks = $c.k.split('.');
                for(let k of ks) {
                    if(!val) {
                        val = v[k];
                    } else {
                        val = val[k];
                    }

                    if(typeof val == 'undefined') { //如果该属性不存在，默认失败
                        return false; 
                    }
                }

                switch($c.sign) {
                    case '==':
                        return val == $c.v;
                    case '>':
                        return val > $c.v;
                    case '<':
                        return val < $c.v;
                    case '!=':
                        return val != $c.v;
                    case '>=':
                        return val >= $c.v;
                    case '<=':
                        return val <= $c.v;
                    case 'include':
                        if(typeof $c.v === 'string' || Array.isArray($c.v)) {
                            return !!val && $c.v.indexOf(val) != -1;
                        } else {
                            return false
                        }
                    case 'exclude':
                        if(typeof $c.v === 'string' || Array.isArray($c.v)) {
                            return !val || $c.v.indexOf(val) == -1;
                        } else {
                            return true;
                        }
                    default:
                        return false;
                }
            });
        }
        return new Collection(ret);
    }
    
    /**
     * 去重操作
     * @param {*} cols 1个或多个用于去重比较的Collection
     */
    diff(...cols){
        return [...this.data.keys()].array_diff(...cols.map(col=>[...col.data.keys()]));
    }

    /**
     * 判定指定key是否存在
     * @param {*} key 
     */
    has(key){
        return this.data.has(key);
    }

    set(key, value){
        this.data.set(key, value);
        this.items = null;
    }
    
    get(key){
        return this.data.get(key);
    }

    del(key){
        let ret = this.data.delete(key);
        this.items = null;
        return ret;
    }

    /**
     * 加载数据集
     * @param {*} ary 
     */
    load(ary){
        this.items = null;
        this.data.clear();
        for(let k of ary){
            this.data.set(k[0], k[1]);
        }
    }

    /**
     * 遍历字典
     * @param {*} func 
     * @param {*} thisArg 
     */
    forEach(func, thisArg){
        this.data.forEach(func, !!thisArg ? thisArg:this);
    }

    ToArray(){
        return [...this.data.values()];
    }
}

exports = module.exports  = Collection;
