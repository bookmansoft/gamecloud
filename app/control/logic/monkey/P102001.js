let facade = require('../../../../facade/Facade')
let {EntityType, em_task_status, em_Condition_Checkmode, em_Condition_Type, ResType, ActionExecuteType, ReturnCode} = facade.const
let UserEntity = facade.UserEntity

/**
 * 聊天室
 */
class P102001 extends facade.Control
{
    /**
     * @brief  报文编号 102001：聊天室操作相关报文
     *
     * @date   2016.10.12
     *
     * @param {UserEntity} user
     * @param  :
     * 名称        | 类型     | 描述
     * ------------|----------|--------------------
     * s           | string   | 发送者名称
     * sid         | int      | 发送者ID
     * n           | string   | 接收者名称
     * nid         | int      | 接收者ID
     * c           | string   | 聊天内容
     *
     */
    async Execute(user, objData) {
        if(!!objData.oemInfo){
            delete objData.oemInfo;
        }

        //填充源用户信息
        objData.sid = user.id;
        objData.s = user.name;
        
        if (!!objData.nid) { //判断是私聊
            let simUser = facade.GetObject(EntityType.User, objData.nid); //获取缓存对象
            if (!!simUser) {
                objData.nid = simUser.id;
                objData.n = simUser.name;

                simUser.privateChatMgr.Record(objData);
                user.privateChatMgr.Record(objData);
            }
        }
        else {
            if(!!objData.system){
                this.parent.service.chat.Record(objData);
            }
            else {//公聊
                if (objData.c != '') {
                    this.parent.service.chat.Record(objData);
                }
            }
        }
        return {code: ReturnCode.Success};
    }
}

exports = module.exports = P102001;
