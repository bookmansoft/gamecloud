/**
 * 单元测试：中间件
 * Creted by liub 2017.3.24
 */
Function.prototype.before = function( fn ){
    return () => {                      // 返回包含了原函数和新函数的"代理"函数
        fn(arguments);                   // 执行新函数
        return this(arguments);        // 执行原函数
    }
};
Function.prototype.after = function( fn ){
    return () => {                      // 返回包含了原函数和新函数的"代理"函数
        let ret = this(arguments);      // 执行原函数
        fn(arguments);                   // 执行新函数
        return ret;
    }
};

/**
 * 将调用方法扩展到任意对象上使用
 */
Function.prototype.uncurrying = function () {
    var self = this;
    return function() {
        var obj = Array.prototype.shift.call( arguments );  //提取参数列表中第一个元素
        return self.apply( obj, arguments );//将函数内部指针替换为上面提取的元素，也就是宿主
    };
};

describe('装饰者模式', function() {
    it('添加before、after装饰器', done =>{
        let something = (function (){ console.log(2); })    //原函数
            .before(function() { console.log(1); })         //装饰器：事先运行
            .after(function() { console.log(3); });         //装饰器：事后运行

        something();

        done();
    });

    it('将push方法扩展到任意对象上使用', done =>{
        let test = {name:'a', value:1};
        Array.prototype.push.uncurrying()( test, 4 );
        console.log( test );

        done();
    });
});
