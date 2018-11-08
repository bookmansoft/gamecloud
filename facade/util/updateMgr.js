let {wait} = require('./commonFunc')
/**
 * Created by liub on 2017-03-27.
 */
class updateMgr
{
    /**
     * 构造函数
     * @param {Number} rev 循环间隔 单位毫秒
     */
    constructor(rev){
        this.rev = rev;
        this.now = Date.parse(new Date());
    }

    /**
     * 单次检测刷新时间是否已到
     * @returns {boolean}
     */
    check(){
        if(Date.parse(new Date()) - this.now >= this.rev){
            this.now = Date.parse(new Date());
            return true;
        }
        return false;
    }

    /**
     * 定时执行指定例程
     * @param interval 循环次数 0表示无限循环
     * @param func 例程
     */
    tick(interval, func){
        let recy = 0;
        let prom = async ()=>{
            if(!this.check()){
                await wait(100);
                prom();
            }
            else{
                try{
                    func(recy++);
                }
                catch(e){
                    console.log(e);
                }
                if(interval == 0 || recy < interval){
                    prom();
                }
            }
        };
        prom();
    }
}
exports = module.exports = updateMgr;