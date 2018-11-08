let facade = require('../../Facade')
let {NotifyType, EntityType} = facade.const

/**
 * 聊天服务
 * updated by liub 2017.5.17
 */
class chat extends facade.Service
{
    /**
     * 构造函数
     */
    constructor(parent){
        super(parent);

        /**
         * 聊天消息队列
         * @var array
         */
        this.msgList = [];
    }

    /**
     * 上行聊天消息处理
     * @return ChatManager
     */
    Record(record){
        record.c = record.c.replace(/(^\s*)|(\s*$)/g, "");
        if(record.c){
            record.mid = 1;
            let $lastItem = this.msgList[this.msgList.length-1];
            if(!!$lastItem){
                record.mid = ($lastItem['mid'] < Number.MAX_VALUE) ? $lastItem['mid'] + 1 : 1;
            }
            this.parent.forAll(user=>{
                user.notify({type: NotifyType.chat, info: record});
                user.privateChatMgr.setCurPoint(record.mid); //推进消息指针
            })
            this.msgList.push(record);
            while(this.msgList.length > 100){
                this.msgList.shift();
            }
        }
        return this;
    }

    /**
     * 查询可以下发的消息列表
     */
    Query(pUser){
        for(let $value of this.msgList){
            if($value['mid'] > pUser.privateChatMgr.getCurPoint()){
                pUser.notify({type: NotifyType.chat, info: $value});
                pUser.privateChatMgr.setCurPoint($value['mid']); //推进消息指针
            }
        }
        return this;
    }
}

module.exports = chat;
