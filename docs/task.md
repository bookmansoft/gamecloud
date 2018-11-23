# 任务系统

## 概述

任务系统实现任务配置的读入、监控任务的完成情况、显示任务列表、领取任务奖励等流程

## 目录结构

1. 任务管理类 

assistant 类的子类，默认使用角色表中的 task 字段完成任务状态的读写：

facade/model/assistant/task.js
```js
const facade = require('gamecloud');

class task extends facade.Assistant {
    /**
     * 构造函数
     * @param {BaseUserEntity} parent 用户角色对象
     */
    constructor(parent) {
        super(parent, 'task'); //指定 task 扩展角色表中的'task'字段为JSON对象
    }

    /**
     * 获取序列化字符串，同时复位脏数据标志
     * @note 基类已实现，可重载
     */
    ToString(){
        this.dirty = false;
        return JSON.stringify(this.v);
    }

    /**
     * 利用来自持久化层的数据进行初始化
     * @note 基类已实现，可重载
     */
    LoadData (val) {
        try {
            this.v = (!val||val == "" ) ? {} : JSON.parse(val);
        }
        catch(e){
            this.v = {};
        }
    }

    /**
     * 获取JSON对象中的属性值
     * @note 基类已实现，可重载
     */
    GetRecord($type){
        return this.v[$type] || 0;
    }
    /**
     * 获取JSON对象中的属性值
     * @note 基类已实现，可重载
     */
    SetRecord($type, val){
        this.v[$type] = val || 0;
        this.dirty = true;  //该数值会被系统自动监测到从而引发自动存储
    }
}
```

使用任务管理类(如果 user 是角色类的实例，那么 user.baseMgr.task 将指向任务管理类的实例)：

```js
//在逻辑流程的合适地方，调用 user.baseMgr.task 的接口方法 Execute，为用户登记任务完成记录：'达成通关新的关卡'
user.baseMgr.task.Execute(em_Condition_Type.gateMaxNo, 1, em_Condition_Checkmode.add);
```

2. 任务配置表: config/data/task.json

```json
{
	"1001":{"id":"1001", "condition":"20,3", "bonus":"1,10", "front":"0", "layer":"0"}
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
