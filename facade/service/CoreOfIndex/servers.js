let facade = require('../../Facade')
let {UserStatus, ReturnCode} = facade.const
let CoreOfBase = facade.CoreOfBase
/**
 * 用户集合管理类, 对IndexServer而言，用户就是已登录的逻辑服务器
 */
class servers extends facade.Service
{
    /**
     * 构造函数
     * @param {CoreOfBase} core 
     */
    constructor(core) {
        super(core);

        this.serverList = {};		    //用户对象map
        this.userNum = {};          //各逻辑服当前注册用户数
    }

    getId(){
        return 0;
    }
    GetObjById(){
        return null;
    }

    /**
     * 加载所有用户的索引
     * @returns {Promise.<void>}
     */
    async loadIndex(db, sa, pwd, serverType, serverId){
        try{
            let sn = `${serverType}.${serverId}`; //服务器唯一编号
            //累计当前服的总人数
            if(!this.userNum[sn]){
                this.userNum[sn] = 0;
            }

            let ret = await facade.models.User(db, sa, pwd).findAll({attrbutes:["id", "score", "domain", "uuid", "pet", "name", "status", "hisGateNo", "role"]});
            for(let it of ret){
                this.userNum[sn] += 1;

                if(it.domain == ""){
                    it.domain = "official";
                }

                let un = `${it.domain}.${it.uuid}`; //用户唯一编号
                let uo = {
                    name: it.name,
                    score: it.score,
                    hisGateNo: it.hisGateNo,
                    status: it.status,
                    role: it.role,
                    domain: it.domain,
                    openid: it.uuid,
                    icon: it.pet,
                    stype:serverType,
                    sid: serverId
                };

                this.core.cacheMgr.set(un, uo);
            }
        }
        catch(e){}
    };

    //region 逻辑服管理
    /**
     * 为集群中的服务器创建反向索引
     * @param {*} svr       逻辑服描述对象
     * @param {*} clear     清除标志
     */
    mapServer(svr, clear = false){
        svr.domainId = `${svr.domain}.${svr.stype}.${svr.sid}`;

        if(!!clear){
            if(!!this.serverList[svr.domainId]){
                delete this.serverList[svr.domainId];//删除字典条目
            }
            return null;
        }

        this.serverList[svr.domainId] = svr;           //添加到字典
        return svr;
    }

    /**
     * 反向查询服务器信息
     * @param stype     //逻辑服类型
     * @param sid       //逻辑服编号
     * @returns {*}
     */
    getServer(stype, sid){
        let domainId = `system.${stype}.${sid}`;
        return this.serverList[domainId];
    }

    getServerTotal(){
        return Object.keys(this.serverList).length;
    }

    /**
     * 遍历所有逻辑服
     * @param $cb
     */
    forServers($cb){
        return Object.keys(this.serverList).map(idx=>{
            let srv = this.serverList[idx];
            if(facade.CoreOfLogic.mapping.indexOf(srv.stype) != -1) {
                return $cb(srv);
            }
        });
    }
    //endregion    
}

exports = module.exports = servers;
