let facade = require('../../../../Facade')
let {RankType} = facade.const
let baseMgr = facade.Assistant
let BonusObject = facade.Util.BonusObject
let um = facade.tools.updateMgr

class txFriend extends baseMgr
{
    /**
     * 构造函数
     * @param {UserEntity} parent 
     */
    constructor(parent, options) {
        options = options || {attr: 'txFriend', size: 2000};
        super(parent, options);
        
        //	数据 最大容量在60个好友左右，建议外部取好友列表控制在50个以内
        this.v 	= {
            friendList: {
                // 1 : {
                //         openid		        : '',
                //         nickname 	        : '',
                //         gender              : '',//性别“男”或“女”
                //         figureurl           : '',//头像地址
                //         is_blue_vip         : false,//是否蓝钻，是返回true，否则false
                //         blue_vip_level      : 0,//蓝钻等级
                //         is_blue_year_vip    : false,//是否年费蓝钻，是返回true，否则false
                //         is_super_blue_vip   : false,//是否豪华蓝钻，是返回true，否则false
                //         is_played           : false,//是否玩过当前游戏，是返回true，否则false
                //         friend_type         : 0,//好友类型 游戏好友为2，im好友为1，游戏关注人4，游戏黑名单8 二者同时为好友输出2
                //         friend_type_addition: 0,//未知
                // }
            },
        };
        this.timer = new um(10);

        this.friends = {};
    }

    /**
     * 合并本地状态
     * @param item
     */
    refresh(item){
        if(item.openid != this.parent.openid){
            if(this.AddFriend(item.openid)){
                if(!!item.role){//保存好友使用的角色信息
                    this.v.friendList[item.openid].o = item.role;
                    this.dirty = true;
                }

                Object.keys(this.v.friendList[item.openid]).map(key=>{
                    item[key] = this.v.friendList[item.openid][key];
                });

                this.friends[item.openid] = item;
            }
        }
        return item;
    }

    /**
     * 跨天刷新
     * @constructor
     */
    DailyRefresh(){
        Object.keys(this.v.friendList).map(key=>{
            this.v.friendList[key].s = 0;
            this.v.friendList[key].r = 0;
        });
        this.dirty = true;
    }

    getRandomBonus(exec=false){
        let bonus = null;
        let rate = Math.random(), oriRate = 0, cfg = this.parent.core.fileMap.sayhelloreward;
        let arr = Object.keys(cfg);
        for(let i = 0; i < arr.length; i++){
            if(oriRate + cfg[arr[i]].rate > rate){
                bonus = BonusObject.convert(cfg[arr[i]].type);
                break;
            }
            oriRate += cfg[arr[i]].rate;
        }

        if(!!bonus && !!exec){
            this.parent.getBonus(bonus); //发放奖励
        }
        
        return bonus;
    }

    /**
     * 向指定好友点赞操作，失败返回0
     */
    sendHello(msg){
        if(msg.info.src == this.parent.openid && msg.info.dst != this.parent.openid){
            if(this.AddFriend(msg.info.dst)){
                if(this.parent.core.options.debug || this.v.friendList[msg.info.dst].s <= 0){
                    this.dirty = true;
                    this.v.friendList[msg.info.dst].s = 1;      //记录点过的赞
                    this.v.friendList[msg.info.dst].h += 1;     //亲密度加1

                    msg.info.social = this.v.friendList[msg.info.dst].h;

                    return msg.info.social;
                }
            }
        }
        return 0;
    }

    /**
     * 被动收到好友的赞时，自动执行的操作
     * @param openid
     */
    recvHello(msg){
        if(msg.info.src != this.parent.openid && msg.info.dst == this.parent.openid){//不能给自己点赞
            //console.log('recvHello', this.parent.openid, openid);
            if(this.AddFriend(msg.info.src)){
                this.v.friendList[msg.info.src].r += 1;   //记录收到的赞
                this.v.friendList[msg.info.src].h += 1;   //亲密度加1
                this.dirty = true;

                return true;
            }
        }
        return false;
    }

    /**
     * 主动收取用户点赞带来的随机奖励，失败返回false
     */
    bonusHello(openid){
        //console.log('bonusHello', this.parent.openid, openid);
        if(openid != this.parent.openid){
            if(this.AddFriend(openid)){
                if(this.v.friendList[openid].r > 0){
                    this.dirty = true;
                    this.v.friendList[openid].r -= 1;

                    //计算、发放并返回随机奖励
                    return this.getRandomBonus(true);
                }
            }
        }
        return false;
    }

    getDefaultValue(){
        return {
            s:0,                        //发出的赞
            r:0,                        //收到的赞
            h:0,                        //亲密度
            o:1001,                     //所使用的角色
        }
    }

    async refreshSocialNetwork(filter = false){
        try{
            try{
                let cache = await this.getSocialNetwork();

                let fns = Object.keys(cache).reduce((sofar, cur)=>{
                    if(cur != this.parent.openid){
                        sofar.push({openid:cur});
                    }
                    return sofar;
                }, [{openid:this.parent.openid}]);
        
                if(!!fns && fns.length > 0){
                    let result = await this.parent.core.remoteCall('getFriendRankList', {list:fns, filter:filter}, msg=>{return msg});
                    for(let item of result.data.list){
                        //为符合 UpdateRecord 的要求，对 item 做了修正：
                        item.id = item.openid;
        
                        //合并本地状态
                        this.refresh(item);
                        //更新排名
                        this.parent.core.GetRanking(this.parent.core.entities.UserEntity).UpdateRecord(item, RankType.friend);
                    }
        
                    return result.data.list;
                }            
            }
            catch(e){
                console.error(e);
            }
        }
        catch(e){
            console.error(e);
        }
        return [];
    }

    /**
     * 获取好友列表
     */
    async getSocialNetwork(){
        if(this.timer.check()) {
            if(this.parent.core.options.debug){
                try{
                    //从索引服务器获取模拟的好友列表
                    let apiRet = await this.parent.core.remoteCall('getFriendList', {domainType: this.parent.domainType, openid: this.parent.openid}, msg=>{return msg});
                    if (!!apiRet && apiRet.ret == 0) {
                        this.dirty = true;
                        apiRet.items.map(item=>{
                            this.AddFriend(item.openid);
                        });
                    }
                    else {
                        console.log(`get_ranklist: ${JSON.stringify(apiRet)}`);
                    }
                }
                catch(e){
                    console.log(e);
                }
            } else {
                try{
                    let apiRet = await this.parent.core.service.txApi.Get_App_Friends(
                        this.parent.openid,
                        this.parent.baseMgr.txInfo.GetOpenKey(),
                        this.parent.baseMgr.txInfo.GetPf(),
                        this.parent.core.options.tx.appid, 1
                    );
                    if (apiRet.ret == 0) {
                        this.dirty = true;
                        apiRet.items.map(item=>{
                            this.AddFriend(item.openid);
                        });
                    }
                    else {
                        console.log(`get_ranklist: ${JSON.stringify(apiRet)}`);
                    }
                }
                catch(e){
                    console.log(e);
                }
            }

            //删除错误数据
            Object.keys(this.v.friendList).map(key=>{
                if(key == "1" || key == this.parent.openid){
                    delete this.v.friendList[key];
                    this.dirty = true;
                }
            });
        }

        return this.v.friendList;
    }

    /**
     * 添加新的好友，不能超过50个
     * @param {*}  
     */
    AddFriend($fid){
        if($fid == this.parent.openid){
            return false;
        }

        if(!this.v.friendList[$fid]) {
            if(Object.keys(this.v.friendList).length >= 50){
                return false;
            }
            this.v.friendList[$fid] = this.getDefaultValue();
            this.dirty = true;
        }
        return true;
    }

    /**
     * 从本地缓存获取好友信息
     * @param {*}  
     */
    getFriend($fid){
        return this.friends[$fid];
    }
}

exports = module.exports = txFriend;