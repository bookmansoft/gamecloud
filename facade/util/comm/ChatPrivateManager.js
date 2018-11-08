let facade = require('../../Facade')
let {NotifyType} = facade.const
/**
 * 私聊管理类
 * updated by liub 2017.5.17
 */
class ChatPrivateManager{
    /**
     * @param {User} parent - 归属用户
     */
    constructor(parent){
        /**
         * 拥有者
         */
        this.parent = parent;
        /**
         * 公聊指针
         * @type {number}
         */
        this.curPoint = 0;
        /**
         * 私聊消息指针
         * @var int
         */
        this.privatePoint = 0;
        /**
         * 私聊消息队列
         * @var array
         */
        this.msgList = [];
    }

    Record(record){
        record.c = record.c.replace(/(^\s*)|(\s*$)/g, "");
        if(record.c != ''){
            record.mid = 1;
            let $lastItem = this.msgList[this.msgList.length-1];
            if(!!$lastItem){
                record.mid = ($lastItem.mid < Number.MAX_VALUE) ? $lastItem['mid']+1 : 1;
            }
            this.parent.notify({type: NotifyType.chat, info: record});
            this.msgList.push(record);
            while(this.msgList.length > 30){
                this.msgList.shift();
            }
        }
        return this;
    }

    Query(){
        for(let $value of  this.msgList){
            if($value.mid > this.privatePoint){
                this.parent.notify({type: NotifyType.chat, info: $value});
                this.privatePoint = $value['mid']; //推进消息指针
            }
        }
        return this;
    }

    /**
     * @return int
     */
    getCurPoint(){
        return this.curPoint;
    }

    /**
     * 设置属性，自动设置保存标志，返回自身以支持链式操作
     * @param int $curPoint
     */
    setCurPoint(curPoint)
    {
        this.curPoint = curPoint;
        return this;
    }
}

module.exports = ChatPrivateManager;