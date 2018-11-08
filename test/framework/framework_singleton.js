let expect = require('chai').expect; //断言库

let getSingle = function( fn ){
    let result;
    return function(){
        return result || ( result = fn .apply(this, arguments));
    }
};

describe('单例模式', function() {
    it('创建单例对象', done =>{
        class AO{
            constructor(id){
                this.id = id;
            }
        };
        AO.prototype.inst = getSingle( function(a){
            return new AO(a);
        });

        let obj1 = AO.prototype.inst(1);
        let obj2 = AO.prototype.inst(2);

        expect(obj1 === obj2).to.be.equal(true);
        console.log(obj2.id);   //由首先创建的对象决定

        done();
    });
});
