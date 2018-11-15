# assistant

## 概述

assistant 系列类用于将**用户对象**的指定字段扩展为JSON对象，并对其进行综合管理。

assistant 以JSON格式从数据库读取字段值，将其转化为内存对象，当数据发生变化时，自动将字段序列化成字符串并写入数据库

## 目录结构

所有用户自定义 assistant 类集中存储于 /app/model/assistant 目录中。

## 编写 assistant
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

## 使用 assistant

在用户登录、创建角色（user）时，所有的 assistant 将被自动创建新的实例并放入 user.baseMgr 中, 例如：

```js
//调用 assistant 的实例 user.baseMgr.task 的接口方法 Execute，为用户登记任务完成记录：'达成通关新的关卡'
user.baseMgr.task.Execute(em_Condition_Type.gateMaxNo, 1, em_Condition_Checkmode.add);
```
