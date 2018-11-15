# 连接器

## 概述
连接器提供连接服务端的客户端组件，该组件既可以在 node 环境下、也可以在浏览器环境下运行

### 运行于 node 环境

```
const toolkit = require('gamegoldtoolkit');
```

### 运行于浏览器环境

```html
    <script src="./js/toolkit-1.5.1.js"></script>
    <script>
        let remote = new toolkit.conn();
    </script>
```

其中 toolkit-1.5.1.js 可通过 gamegoldtoolkit 打包而来

1. 下载 gamegoldtoolkit 代码仓库

2. 执行打包程序
```
npm run build
```
lib目录下生成的 bundle.js 就是所需的库文件

## 如何获取连接器

npm package:
```
npm i gamegoldtoolkit
```

git 仓库:
```
git clone https://github.com/bookmansoft/gamegoldtoolkit
```

## 连接器的用法
