let facade = require('../../../../Facade')
let {EntityType, AllyNewsType} = facade.const
let {ally_news} = require('../table/ally_news')
let BaseEntity = facade.BaseEntity

/**
 * 联盟新闻 
 * Class AllyNews
 *
 * -- 表 allynews 结构
 *   `idx` int(11) NOT NULL, AUTO_INCREMENT, PRIMARY KEY
 *   `aid` int(11) NOT NULL,
 *   `newstype` int(11) NOT NULL,
 *   `content` varchar(500) NOT NULL,
 *   `buildTime` int(11) NOT NULL,
 */
class AllyNews extends BaseEntity
{
    GetRecord($value) {
        return {
            'idx' : $value.idx,
            'playId' : $value.aid,
            'content' : $value.content,
            'newstype' : $value.newstype,
            'buildTime' : $value.buildTime,
        };
    }

    /**
     * 构造函数
     * @param {ally} orm 
     * @param {CoreOfBase} core
     */
	constructor(orm, core){
        super(orm, core);
    }

    /*
     * 可读格式的联盟新闻的构造函数
     * @ret: MsgAllyNews
     */
    ToMsgAllyNews($ret){
        $ret.AllySrcId = this.aid;
	    $ret.newsType = this.newsType;

    	let $ao = this.core.GetObject(EntityType.Ally, $ret.AllySrcId);
    	if($ao){
		    $ret.AllySrcName = $ao.Name;
	    }
    	$ret.newsTime = this.timeStamp - facade.util.now();

    	let $_NullAllyName = "[?]"; //无盟时填充的联盟名称
	    switch(this.newsType){
            case AllyNewsType.BeUnion:
                break;
    	}
    }

    //region 集合功能

    /**
     * 索引值
     */
    IndexOf(type){
        switch(type){
            default:
                return this.orm.id;
        }
    }

    /**
     * 使用Mapping映射类时的配置参数
     */
    static get mapParams(){
        return {
            model: ally_news,               //对应数据库单表的ORM封装
            entity: this,                   //实体对象，在model之上做了多种业务封装
            group: 'aid',                   //分组键
            etype: EntityType.AllyNews,
        };
    }

    /**
     * 创建时的回调函数
     * @param {*} mysql
     */
    static async onCreate(mysql, aid, newsType, content, buildTime) {
        try{
            let it = await ally_news(mysql).create(this.getDefaultValue(aid, newsType, content, buildTime));
            return it[0];
        }
        catch(e){
            console.error(e);
            return null;
        }
    }

    /**
     * 进行字典映射时的回调函数
     * @param {*} user 
     */
    static onMapping(user, core) {
        let pUser = new this(user, core);
        return pUser;
    }

    /**
     * 载入条目时的回调函数
     * @param {*} mysql
     * @param {*} callback 
     */
    static async onLoad(mysql, callback){
        try {
            let ret = await ally_news(mysql).findAll({
                where:{
                    aid:aid,
                }
            });
            ret.map(it=>{
                callback(it);
            });
        } catch(e) {}
    }

    /**
     * 填充条目默认值
     * @param {*} userName 
     * @param {*} domain 
     * @param {*} openid 
     */
    static getDefaultValue(aid, newsType, content, buildTime){
        return {
            aid: aid,
            newsType: newsType, 
            content: content,
            buildTime: buildTime,
        };
    }
    //endregion
}

exports = module.exports = AllyNews;
