let Collection = require('../../facade/util/Collection')

describe('Collection', ()=>{
    it('load', ()=>{
        let co = new Collection([
            [1, {'id':'1'}],
            [2, {'id':'2'}],
            [3, {'id':'3'}]
        ]);
        co.forEach((v,k)=>{
            console.log(v,k);
        });
    });
    it('where', ()=>{
        let co = new Collection([[1, {'id':'1'}],[2, {'id':'2'}],[3, {'id':'3'}]]);
        co.where([['id', '>=', 2],['id', '<', 3]]).forEach((v,k)=>{
            console.dir(v);
        });
    });
    it('filter', ()=>{
        let co = new Collection([[1, {'id':'1'}],[2, {'id':'2'}],[3, {'id':'3'}]]);
        co.where([['id', '>=', 2]]).where([['id', '<', 3]]).forEach((v,k)=>{
            console.dir(v);
        });
    });
    it('key access', ()=>{
        let co = new Collection([[1, {'id':'1'}],[2, {'id':'2'}],[3, {'id':'3'}]]);
        console.log(co.get(2));
    });
    it('key delete', ()=>{
        let co = new Collection([[1, {'id':'1'}],[2, {'id':'2'}],[3, {'id':'3'}]]);
        co.del(2);
        co.forEach((v,k)=>{
            console.dir(v);
        });
    });
    it('diff', ()=>{
        let co1 = new Collection([[1, {'id':'1'}],[2, {'id':'2'}],[3, {'id':'3'}]]);
        let co2 = new Collection([[3, {'id':'3'}],[4, {'id':'4'}],[5, {'id':'5'}]]);
        let co3 = new Collection([[2, {'id':'2'}],[4, {'id':'4'}],[5, {'id':'5'}]]);
        console.log(co1.diff(co2, co3));
    });
});
