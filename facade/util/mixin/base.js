/**
 * 前置装饰器
 */
Function.prototype.before = function( fn ){
    return () => {                      // 返回包含了原函数和新函数的"代理"函数
        fn(arguments);                   // 执行新函数
        return this(arguments);        // 执行原函数
    }
};
/**
 * 后置装饰器
 */
Function.prototype.after = function( fn ){
    return () => {                      // 返回包含了原函数和新函数的"代理"函数
        let ret = this(arguments);      // 执行原函数
        fn(arguments);                   // 执行新函数
        return ret;
    }
};
/**
 * 扩展方法
 */
Function.prototype.uncurrying = function () {
    var self = this;
    return function() {
        var obj = Array.prototype.shift.call( arguments );
        return self.apply( obj, arguments );
    };
};

/**
 * 随机挑选并返回数组中的一个元素，不影响原数组
 * @param {Array} list 
 */
Array.prototype.randomElement = function($n=1){
    let ret = [];
    if(this.length == 0){
    }
    else if(this.length < $n){
        this.map(it=>{
            ret.push(it);
        });
    }
    else{
        while(ret.length < $n){
            let cur = this[(Math.random()*this.length | 0) % this.length];
            if(ret.indexOf(cur)==-1){
                ret.push(cur);
            }
        }
    }
    return ret;
}

/**
 * 将本数组和传入的一个或多个数组进行比对，将本数组中不和其他数组重复的元素组成新的数组并返回
 * @param {*} params 
 */
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
 * 将本数组中符合断言的元素全部删除
 * @param {*} fn 
 */
Array.prototype.array_delete = function(fn){
    this.reduce((sofar,cur)=>{
        if(fn(cur)){
            sofar.push(cur);
        }
        return sofar;
    }, []).map(it=>{
        this.splice(this.indexOf(it),1);
    });
}
