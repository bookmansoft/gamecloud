/**
 * Updated by liub on 2017-07-02.
 */

let facade = require('../../Facade')
let {UserStatus, CommMode} = facade.const
let CoreOfBase = facade.CoreOfBase
let rp = require('request-promise')

/**
 * 逻辑服对应的门面类
 */
class CoreOfImage extends CoreOfBase {
    async Start(app){
        //Image Server构造比较简单，此处也没有调用父类的Start

        let hrv = this.options.UrlHead == "https" ? 
            require(this.options.UrlHead).createServer(this.credentials, app) : 
            require(this.options.UrlHead).createServer(app);
        //启动网络服务
        hrv.listen(this.options.webserver.port, this.options.webserver.host, () => {
            console.log(`图片服务在端口 ${this.options.webserver.port} 上准备就绪`);
        });

        //抓取跨域图片
        app.get('/socialImg', (req, res)=>{
            if(!!req.query.m){
                try{
                    rp({uri: decodeURIComponent(req.query.m),headers: {'User-Agent': 'Request-Promise',}}).pipe(res);
                }
                catch(e){
                    console.error(e);
                    res.end();
                }
            }
            else{
                try{
                    rp({uri: decodeURIComponent(this.fileMap.DataConst.user.icon),headers: {'User-Agent': 'Request-Promise',}}).pipe(res);
                }
                catch(e){
                    console.error(e);
                    res.end();
                }
            }
        });
    }

    /**
     * 映射自己的服务器类型数组，提供给核心类的类工厂使用
     */
    static get mapping() {
        if(!this.$mapping) {
            this.$mapping = ['Image'];
        }
        return this.$mapping;
    }
    static set mapping(val) {
        this.$mapping = val;
    }
}

exports = module.exports = CoreOfImage;