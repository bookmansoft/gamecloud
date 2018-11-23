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
     * @param {*} current   当前页码
     * @param {Array} attrs 属性选择
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

        let self = this;
        for(let i = this.pageSize*(this.pageCur-1); i<this.pageSize*this.pageCur; i++){
            if(!this.items[i]){
                break;
            }

            if(!!this.attrs && this.attrs.constructor == Array){
                $pageItems.push(this.attrs.reduce((sofar,cur)=>{
                    sofar[cur] = GetAttr(self.items[i], cur);
                    return sofar;
                }, {}));
            }
            else{
                $pageItems.push(this.items[i]);
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
            if(cond.constructor != Array || cond.length < 2){
                continue;
            }
    
            let $c = {k:cond[0], sign:cond.length==2 ? '==' : cond[1], v:cond.length==2 ? cond[1] : cond[2]};
            ret = ret.filter(([k,v]) => {
                if(!v[$c.k]){
                    return false;
                }

                switch($c.sign){
                    case '==':
                        return v[$c.k] == $c.v;
                    case '>':
                        return v[$c.k] > $c.v;
                    case '<':
                        return v[$c.k] < $c.v;
                    case '!=':
                        return v[$c.k] != $c.v;
                    case '>=':
                        return v[$c.k] >= $c.v;
                    case '<=':
                        return v[$c.k] <= $c.v;
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
        this.data.clear();
        ary.map(k=>{
            this.data.set(k[0], k[1]);
        });
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
