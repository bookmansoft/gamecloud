/**
 * Created by Administrator on 2017-05-13.
 */
let facade = require('../../Facade')
let {UserStatus, CommMode} = facade.const

/**
 * 索引服对应的门面类
 */
class CoreOfIndex extends facade.CoreOfBase
{
    constructor($env){
        super($env);
        
        this.testRoute = new Set(); //直连测试服的openid列表

        //中间件设定 - 注意不要覆盖父类构造函数已经做出的设定
        this.middlewareSetting.default = ['parseParams', 'commonHandle'];
    }

    /**
     * 映射自己的服务器类型数组，提供给核心类的类工厂使用
     * @returns {Array}
     * 
     * @note 索引服务器mapping取固定值
     */
    static get mapping() {
        return ['CoreOfIndex'];
    }
    static set mapping(val) {
    }

    routeList(){
        let ret = [];
        this.testRoute.forEach((item, sameItem, s)=>{
            ret.push(item);
        })
        if(ret.length == 0){
            ret.push('添加测试路由');
        }
        return ret;
    }

    async Start(app){
        super.Start(app);

        //缓存管理器
        this.cacheMgr = new facade.tools.cache(this);

        console.time(`${this.options.serverType}${this.options.serverId} Load Db`);
        await this.service.dailyactivity.loadDb(); //载入世界Boss活动信息
        this.loadAllUsers(()=>{
            console.timeEnd(`${this.options.serverType}${this.options.serverId} Load Db`);
            console.log(`${this.options.serverType}.${this.options.serverId}: 数据载入完成，准备启动网络服务...`);
            this.StartSocketServer(app);
        });

        //世界Boss活动检测，只在Index Server上进行
        this.autoTaskMgr.addCommonMonitor(fo=>{
            fo.service.dailyactivity.tick();
            return false;
        });
    }

    /**
     * 根据DomainId列表，批量查询并返回用户对象列表
     * @param {*} list 传入openid集合，注意并没有携带域信息，因为我们认为社交好友是可以同时注册多个服的
     * @returns 返回键值对集合形式的对象: domain.openid: user
     */
    async getUserIndexOfAll(list){
        let ret = {};
        let query = this.cacheMgr.get(list);
        if(!!query){
            query.map(uo=>{
                if(!!uo) { //由于对用户领域进行了猜测，这里要判断下查询结果是否为空
                    ret[`${uo.domain}.${uo.openid}`] = uo;
                }
            });
        }
        return ret;
    }

    /**
     * 检索用户所在服务器信息, 如果是新用户则采用负载均衡模式分配目标服务器
     * @param domainId
     * @param openid
     */
    async getUserIndex(domain, openid, register=null) {
        //计算用户唯一标识串
        let domainId = `${domain}.${openid}`;

        let uo = this.cacheMgr.get(domainId);
        if(!!uo) {
            uo.status = facade.tools.Indicator.inst(uo.status).unSet(UserStatus.isNewbie).value;
        } else if(!!register) { //新用户注册
            //检测逻辑服类型
            let stype = 'IOS';
            let pl = domain.split('.');
            if(pl.length > 1) {
                stype = pl[1];
            }

            if(!this.serversInfo[stype]) {//非法类型
                return null;
            }

            let serverId = 0, sn = null;
            if(!register.sid) {
                //负载均衡
                serverId = (facade.util.hashCode(domainId) % this.serverNum(stype)) + 1;   //通过hash计算命中服务器编号
                sn = `${stype}.${serverId}`;

                //避免新用户进入不合适的服务器（人数超限或状态不正常）
                let recy = 0, isFind = false;
                while(recy++ < this.serverNum(stype)){//检测服务器人数和运行状况
                    let svr = this.service.servers.getServer(stype, serverId);
                    if(!!svr && this.service.servers.userNum[sn] < this.options.MaxRegister){
                        isFind = true;
                        break;
                    }

                    serverId = serverId % this.serverNum(stype) + 1; //循环递增
                    sn = `${stype}.${serverId}`;
                }

                if(!isFind){
                    return null;
                }
            } else {
                serverId = register.sid; //注册时指定了服务器编号
                sn = `${stype}.${serverId}`;
            }
            
            //寻找到了合适的服务器，累计服务器人数
            this.service.servers.userNum[sn] += 1;
            
            //为注册用户预登记
            uo = {
                hisGateNo: 1,
                role: 1001,
                name: '',
                icon: '',
                stype:stype, 
                sid:serverId, 
                score:0, 
                status: UserStatus.isNewbie,
                domain:domain, 
                openid:openid
            }
            this.setUserIndex(uo);
        }
        return uo;
    }

    /**
     * 将用户对象存回Redis
     * @param {*} uo 
     */
    setUserIndex(uo){
        if(!!uo && uo.domain && uo.openid){
            this.cacheMgr.set(`${uo.domain}.${uo.openid}`, uo);
        }
    }

    /**
     * 加载全部用户索引
     * @returns {Promise.<void>}
     */
    async loadAllUsers(cb){
        try{
            //遍历所有服务器，以便加载所有用户的索引
            for(let stype in this.serversInfo) {
                for(let id in this.serversInfo[stype]){
                    let item = this.serversInfo[stype][id];
                    await this.service.servers.loadIndex(item.mysql, stype, id); //载入分服的用户
                }
            }

            cb(); //外部传入的回调
        }
        catch(e){
            console.error(e);
        }
    }
}

exports = module.exports = CoreOfIndex;