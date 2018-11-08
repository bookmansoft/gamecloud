let facade = require('../../../facade/Facade')
let {em_Condition_Checkmode, NotifyType, ResType, ActivityType,em_Condition_Type} = facade.const
let {EventData} = require('../../../facade/util/comm/EventData')

/**
 * 任务事件
 * @param {EventData} event 
 */
function handle(event){
    let func = item => {
        event.user.getTaskMgr().Execute(item.type, item.value, !!item.mode ? item.mode : em_Condition_Checkmode.add);
    };

    if(event.data.constructor == Array){//以数组方式，同时传入多个任务事件
        event.data.map(item=>{
            func(item);
        });        
    }
    else{
        func(event.data);
    }
}

module.exports.handle = handle;
