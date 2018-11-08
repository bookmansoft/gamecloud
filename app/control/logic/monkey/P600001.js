let facade = require('../../../../facade/Facade')
let {EntityType, UserStatus, ActivityType, NotifyType, ActionExecuteType, em_Condition_Type, OperEnum, ReturnCode} = facade.const
let UserEntity = facade.UserEntity
let BonusObject = require('../../../../facade/util/comm/BonusObject')

/**
 * 邮箱相关的操作类型
 */
const em_Mail_OperType = {
    /**
     * 发送
     */
    send: 1,
    /**
     * 删除
     */
    del: 2,
    /**
     * 查询列表 列出所有PVE伙伴，包括激活、未激活
     */
    query: 3,
    /**
     * 阅读
     */
    read: 4,
}

/**
 * 邮箱系统
 */
class P600001 extends facade.Control
{
    /**
     * @brief  报文编号 600001 
     *
     * @date   2018.1.25
     *
     * @param  :
     * 名称        | 类型     | 描述
     * ------------|----------|--------------------
     * oper        | int      | 操作类型
     * page        | int      | 请求的数据集页面编码
     * pageSize    | int      | 请求的数据集页面大小
     * idx         | int      | 请求的数据项编号
     *
     * @return
     * 名称        | 类型     | 描述
     * ------------|----------|----------------------
     * code        | int      | 返回码
     * data        | object   | 返回的数值对象
     *
     * @note
     */
    async Execute(user, input) {
        input.oper = parseInt(input.oper || 0);
        input.idx = JSON.parse(input.idx || "[0]");
        input.page = parseInt(input.page || 1);
        input.pageSize = parseInt(input.pageSize || 5);

        let $code = ReturnCode.Success;

        switch(input.oper){
            case em_Mail_OperType.query:
                let mb = facade.GetMapping(EntityType.Mail)
                    .groupOf(user.openid)
                    .orderby('time', 'desc')
                    .paginate(input.pageSize, input.page);
                let list = mb.records(['id', 'src', 'dst', 'content', 'time', 'state']);
                return { code: ReturnCode.Success, data: {cur:mb.pageCur, total:mb.pageNum, list:list}};

            case em_Mail_OperType.send:
                facade.GetMapping(EntityType.Mail).Create(user, input.con, user.openid, input.openid);
                return {code: ReturnCode.Success};

            case em_Mail_OperType.del:
                for(let id of input.idx){
                    await facade.GetMapping(EntityType.Mail).Delete(id);
                }
                user.CheckMailboxState();
                return {code: ReturnCode.Success, data:{idx:input.idx}};

            case em_Mail_OperType.read:
                let bonus = [];
                for(let id of input.idx){
                    let mail = facade.GetObject(EntityType.Mail, id);
                    if(!!mail){
                        bonus = bonus.concat(await mail.read(user));
                    }
                }
                bonus = BonusObject.merge(bonus);
                user.CheckMailboxState();
                return {code: ReturnCode.Success, data: {idx:input.idx, bonus:bonus}};
    
        }
        return {code:$code};
    }
}

exports = module.exports = P600001;
