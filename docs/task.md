# 任务系统

## 概述

任务系统实现任务配置的读入、监控任务的完成情况、显示任务列表、领取任务奖励等流程

## 目录结构

1. 任务管理类 

任务管理类是 assistant 类的子类：
facade/model/assistant/task.js

```js
const facade = require('gamecloud');

class task extends facade.Assistant {
    /**
     * 构造函数
     * @param {BaseUserEntity} parent 代表用户的角色对象
     */
    constructor(parent) {
        //指定角色表中的'task'字段为任务管理的持久化字段
        super(parent, 'task'); 
    }
}
```

如果 user 是角色类的实例，那么 user.baseMgr.task 将指向任务管理类的实例：

```js
//在逻辑流程的合适地方，调用 user.baseMgr.task 的接口方法 Execute，为用户登记任务完成记录：'达成通关新的关卡'
user.baseMgr.task.Execute(em_Condition_Type.gateMaxNo, 1, em_Condition_Checkmode.add);
```

2. 任务配置表: config/data/task.json

```json
{
    "1001":                         //任务编号
    {
        "id":"1001",                //任务编号
        "condition":"20,3",         //任务条件设定
        "bonus":"1,10",             //任务奖励设定
        "front":"0",                //任务的前置任务设定，直接引用任务编号(逗分字符串)
        "layer":"0"                 //任务的嵌套层次
    }
}
```

3. 任务管理控制器
facade/control/CoreOfLogic/task.js

```js
class task extends baseCtl {
    async list(user, objData){
        return {
            code: ReturnCode.Success,
            data: user.baseMgr.task.getList(objData.type, objData.status)
        }
    }

    async getBonus(user, objData){
        return {
            code: ReturnCode.Success,
            data: user.baseMgr.task.getBonus(objData.id)
        }
    }
    async getInfo(user,objData){
        return {
            code: ReturnCode.Success,
            data: user.baseMgr.task.getTaskObj(objData.id)
        }
    }
}
```
