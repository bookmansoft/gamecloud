let facade = require('../../../facade/Facade')
let {IndexType, EntityType, UserStatus, ActivityType, ReturnCode} = facade.const
let BonusObject = require('../../../facade/util/comm/BonusObject')
let {Mail} = require("../table/Mail")
let UserEntity = facade.entities.UserEntity
let BaseEntity = facade.BaseEntity
let CoreOfBase = facade.CoreOfBase

/**
 * 消息管理器
 * Added by liub 2017.7.25
 */
class mails extends BaseEntity
{
    constructor(orm, core){
        super(orm, core);
    }

    /**
     * 读取邮件，同步检查是否有未领取奖励
     * @param {UserEntity} uo    用户对象 
     */
    async read(uo){
        if(this.orm.state == 0){ //只处理未读邮件
            this.orm.state = 1;
            this.orm.save();

            return this.handleAdditional(uo);
        }
        return [];
    }

    /**
     * 处理附件
     * @param {*} msg 
     */
    handleAdditional(user) {
        if(typeof user != 'object') {
            user = this.core.GetObject(EntityType.User, user, IndexType.Foreign);
        }

        if(!user) {
            return [];
        }

        let $content = JSON.parse(this.orm.content);
        if(!!$content.info.bonus){ //有未领取奖励
            if(typeof $content.info.bonus == "string"){
                $content.info.bonus = BonusObject.convert($content.info.bonus);
            }
            user.getBonus($content.info.bonus);
            if($content.info.bonus.constructor == Array){
                return $content.info.bonus;
            }
            else{
                return [$content.info.bonus];
            }
        }
        return [];
    }

    get src(){
        return this.orm.src;
    }
    get dst(){
        return this.orm.dst;
    }
    get content(){
        return this.orm.content;
    }
    get time(){
        return this.orm.time;
    }
    get state(){
        return this.orm.state;
    }
    get id(){
        return this.orm.id;
    }

    //region 集合功能

    /**
     * 索引值，用于配合Mapping类的索引/反向索引
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
            model: Mail,            //对应数据库单表的ORM封装
            entity: mails,          //实体对象，在model之上做了多种业务封装
            etype: EntityType.Mail,
            group: 'dst',           //分组键
        };
    }

    /**
     * 创建时的回调函数
     */
    static async onCreate(mysql, uo, content, src, dst) {
        try {
            if(content.constructor == Object) { //数据库字段格式为string，此处适配下
                content = JSON.stringify(content);
            }

            let it = await Mail(mysql).create({
                src: src,
                dst: dst,
                time: facade.util.now(),
                content: content,
                state: 0            //未读取状态
            });

            uo.DelegateByOpenid(user => {
                user.baseMgr.info.SetStatus(UserStatus.newMsg); //为目标用户设置新邮件标志
            }, dst);

            return it;
        }
        catch(e){
            console.error(e);
        }
        return null;
    }

    /**
     * 删除指定邮件
     * @param {*} entity 
     */
    static async onDelete(entity) {
        if(entity.state == 0){ //只有删除未读邮件，才会引发状态变化
            entity.handleAdditional(entity.dst);
        }
    }

    /**
     * 进行字典映射时的回调函数
     * @param {*} record 
     * @param {CoreOfBase} core
     */
    static onMapping(record, core) {
        let mail = new mails(record, core);
        return mail;
    }

    /**
     * 载入数据库记录时的回调函数
     * @param {*} mysql
     * @param {*} callback 
     */
    static async onLoad(mysql, callback){
        try {
            let $expired = facade.util.now() - 3600*24*30; //只读取一个月内的邮件
            let ret = await Mail(mysql).findAll({
                where: {
                    time: {$gt: $expired}
                }
            });
            ret.map(it=>{
                callback(it);
            });
        } catch(e){}
    }
    //endregion
}

exports = module.exports = mails;
