# 模型管理

## 概述

gamecloud 的模型管理为数据库表提供了一种面向对象的管理范式，这种范式是在 ORM 层面上进一步封装而成的
所有的用户自定义模型位于 app/model 目录下，分为 table 和 entity，其中 table 直接映射数据库表，entity映射orm对象

## 建立 orm 模型

下面以新增 test 表为例，描述建立 orm 模型的详细步骤

1. 新增 db-migrate 迁移文件
20191111062616-create-test.js

2. 执行 db-migrage 计划，自动生成 test 表结构
```bash
npm run commit
```

3. 新增表映射文件
app/model/table/test.js

4. 新增ORM映射文件
app/model/entity/testEntity.js

**注意要为新增实体设立一个唯一编号，本案中为 101**
```js
    static get mapParams(){
        return {
            model: Test,                    //对应数据库表的映射类
            entity: this,                   //ORM映射类，在表映射类上做了多种业务封装
            etype: 101,                     //实体类型
            group: 'item',                  //(可选)对记录进行分组的键名称
        };
    }
```

5. 将新增表加入自动加载列表中
```js
facade.boot({
    env: env,
    loading: [
        101,        //指示加载 test 表
    ],
});
```

## CURD

```js
let entityType = 101;
lit id = 1;

//创建新的条目
let record = await facade.GetMapping(entityType).Create();

//根据id查找表中记录
record = facade.GetObject(entityType, id);           

//修改记录中指定字段，底层机制会确保自动保存至数据库
record.setAttr('item', Math.random().toString());

//删除指定记录
let db = true; // 表示同时从数据库删除
facade.GetMapping(entityType).Delete(id, db);

//分页列表
let page = 1;
let result = facade.GetMapping(entityType)  //得到 Mapping 对象
    .groupOf()                              //将 Mapping 转化为 Collection，如果 Mapping 支持分组，可以带分组参数调用
    .orderby('id', 'desc')                  //根据id字段倒叙排列
    .paginate(5, page, ['id', 'item']);     //每页5条，显示第1页，只选取'id'和'item'字段
```
