let {extendObj, applyMixins} = require('../../facade/util/mixin/comm');

describe('mixin', ()=>{
    it('mixin 1', done =>{
        class A{
            constructor(){
                this.name = 'a';
            }
            a(){console.log(this.name);}
        }
        class B{
            constructor(){
                this.name = 'b';
            }
            b(){console.log(this.name);}
        }
    
        let C = applyMixins(A, B);
        let c = new C();
        c.a();
        c.b();
    
        let a = new A(), b = new B();
        let cc = extendObj(a, b);
        cc.a();
        cc.b();
    
        done();
    });

    it('mixin 2', () => {
        class A {
            mixin(){
                this.age = 10;
            }
        }
        class B {
            constructor() {
                this.techerId = 100;
                if(!!A.prototype.mixin){
                    A.prototype.mixin.apply(this);
                }
            }
            print(){
                console.log(this.age);
            }
        }
        let C = applyMixins(B,A);
        let cc = new C;
        cc.print();
    });

    it('test', ()=>{
    });
});
