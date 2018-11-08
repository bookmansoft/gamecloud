let {LargeNumberCalculator} = require('../../facade/util/comm/LargeNumberCalculator');
let expect = require('chai').expect; //断言库

describe('large Number', ()=>{
    it('print Object', ()=>{
        let ln = LargeNumberCalculator.instance(1, 2);
        console.log('Object', ln);
        console.log('to Array', ln.ToArray());
        console.log('to String', ln.ToString());
    })

    it('load & new instance', ()=>{
        let n1 = LargeNumberCalculator.instance(1,2);
        let n2 = LargeNumberCalculator.FromString('1,2');
        expect(LargeNumberCalculator.Compare(n1,n2)).to.be.equal(0);
    })

    it('clone & Compare', ()=>{
        let n1 = LargeNumberCalculator.instance(1,2);
        let n2 = LargeNumberCalculator.Clone(n1);
        expect(LargeNumberCalculator.Compare(n1,n2)).to.be.equal(0);
    })

    it('add & sub & dev & multi', ()=>{
        let n1 = LargeNumberCalculator.instance(0,0);
        expect(n1._compare_([0,0])).to.be.equal(0);
        expect(n1._add_(20)._compare_([2,1])).to.be.equal(0);
        expect(n1._sub_(10)._compare_([1,1])).to.be.equal(0);
        expect(n1._mul_(100)._compare_([1,3])).to.be.equal(0);
        expect(n1._dev_(1000)._compare_([1,0])).to.be.equal(0);
    })

    it('calc large power', ()=>{
        let n1 = LargeNumberCalculator.Power(2000, 1000);
        expect(n1._compare_([1.0715,3301])).to.be.equal(0);
    });
})