let facade = require('../../../../facade/Facade')
let {EntityType, UserStatus, ActivityType, NotifyType, ActionExecuteType, em_Condition_Type, OperEnum, ReturnCode} = facade.const
let UserEntity = facade.UserEntity

/**
 * 邮箱管理器
 * Updated by liub on 2017-07-26.
 */
class mail extends facade.Control
{
    /**
     * 读取邮件列表
     * @param {UserEntity} user 
     * @param {*} objData 
     */
    async getList(user, objData) {
        if(!objData.pageSize){
            objData.pageSize = 10;
        }
        if(!objData.page){
            objData.page = 1;
        }

        let list = facade.GetMapping(EntityType.Mail)
            .groupOf(user.openid)
            .orderby('time', 'desc')
            .paginate(10, objData.page)
            .records(['id', 'src', 'dst', 'content', 'time', 'state']);

        return { code: ReturnCode.Success, data: list,};
    }

    /**
     * 向指定用户发送一封文本邮件
     * @param {UserEntity} user 
     * @param {*} objData 
     */
    async send(user, objData) {
        //考虑到用户可能跨服，这里使用好友间的notify转发下
        user.socialNotify(
            {type: NotifyType.mail, info: {src: user.openid, dst: objData.openid, con:objData.con}},
            objData.openid
        );
        return {code: ReturnCode.Success};
    }

    /**
     * 删除一篇邮件
     * @param {UserEntity} user 
     * @param {*} objData 
     */
    async del(user, objData)
    {
        await facade.GetMapping(EntityType.Mail).Delete(objData.idx);
        user.CheckMailboxState();
        return {code: ReturnCode.Success, data:{idx:objData.idx}};
    }

    /**
     * 阅读了一篇邮件
     * @param {UserEntity} user 
     * @param {*} objData 
     */
    async read(user, objData)
    {
        let mail = facade.GetObject(EntityType.Mail, objData.idx);
        if(!!mail){
            await mail.read(user);
            user.CheckMailboxState();
        }
        return {code: ReturnCode.Success, data: {idx:objData.idx}};
    }
}

exports = module.exports = mail;
