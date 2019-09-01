# service 的开发

## 概述

service 是指一类继承自FSM(有限状态机)的特殊类
节点启动时，自动为这些类创建单例对象，注册为 core.service 的成员属性

## 目录结构

service 类定义文件 **按照节点类型分类放置**，位于 /core_class_name/service 中

## service 的开发和使用

service 都由 facade.Service 类继承而来，自动具备状态管理能力

可以通过 core.service.${serviceName} 访问这些单例对象
