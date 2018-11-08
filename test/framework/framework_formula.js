/**
 * 单元测试：表达式解析
 * Creted by liub 2017.7.19
 */
let FormulaEvaluator = require('../../facade/util/formula');
let expect = require('chai').expect; //断言库

describe('表达式解析', function() {
    it('计算一个简单的表达式', done =>{
        //使用默认的运算符号
        let simEvaluator = (new FormulaEvaluator()).compile("(a-b)*(a+b)");
        expect(simEvaluator.evaluate({a:3,b:1})).to.be.equal(8);
        expect(simEvaluator.evaluate({a:5,b:1})).to.be.equal(24);

        //自定义运算符号
        let evaluator = (new FormulaEvaluator([["~", "Math.pow", 5000, function(foo, bar) { return Math.pow(foo, bar); }]]))
            .compile("(a-b)*((a+b)~3)");

        expect(evaluator.evaluate({a:3,b:1})).to.be.equal(128);
        expect(evaluator.evaluate({a:2,b:2})).to.be.equal(0);

        done();
    });
});
