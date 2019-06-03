# 集成游戏金链

## 引入游戏金链依赖包

```bash
npm i gamegold
```

## 配置节点信息

在 gameconfig.js 中配置如下信息：
```js
    "apps" : [
        {//游戏金链节点配置
            "name"      : "gamegold",
            "script"    : "app/gamegold.js",
            "cwd"         : "./",                           // pm2运行目录相对main.js的路径
            "error_file" : "./logs/gamegold/app-err.log"    // 错误日志路径
        }
    ]
```

所需启动文件保存于如下路径：
/app/gamegold.js

## 运行节点

运行如下语句，将在正常运行 gamcloud 类型的节点的同时，也会启动正确配置的游戏金链节点：

```bash
npm start
```
