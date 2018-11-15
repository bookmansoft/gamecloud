# 在线数据维护任务管理

## 概述

gamecloud 提供了在线数据维护任务的管理机制，可以实现如下业务流程：
1. 编写数据维护任务，存储于单一文件
2. 执行任务，自动更新已执行任务列表

## 数据维护文件

- 一个维护任务是由单个文件规范的
- 每个维护任务都有一个名称标识，并通过底层机制确保只能运行一次
- 如果确定需要重新运行，需要手工修改config/maintain.json中相应标识对应的布尔值(执行前为false，执行后为true)

## 目录结构

如下文件保存所有已执行任务列表，并由系统自动维护，以判断各个任务执行与否：
/config/maintain.json

如下目录存放所有数据维护任务文件：
/config/maintain/

## 编写数据维护任务

每个数据维护任务都是一个 baseTask 的子类，单独存储于一个数据维护文件中 ( 参见 /config/maintain/example.js )：

```js
class task extends baseTask { 
    //...
}
exports = module.exports = task;
```

## 运行数据维护任务

```bash
npm run maintain
```

数据维护任务的运行，并不依赖平台的运行，而更像是独立运行了一个数据库存储过程