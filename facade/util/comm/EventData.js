let facade = require('../../Facade')
let UserEntity = facade.entities.UserEntity

/**
 * 自定义事件信息结构
 */
class EventData
{
    /**
     * @return {UserEntity}
     */
    get user(){
        return this.$user;
    }
    set user(val){
        this.$user = val;
    }
    get data(){
        return this.$data;
    }
    set data(val){
        this.$data = val;
    }
}

exports.EventData = EventData;