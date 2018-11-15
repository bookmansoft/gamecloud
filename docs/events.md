# 事件系统

## 书写事件句柄

所有的事件处理文件集中放置在 app/events/ 目录下，可以嵌套多级目录，例如：
app/events/test/update.js

## 确定事件的调用名称

app/events/ 以下的全路径+不带后缀文件名的点分形式，如上述事件的调用名称为： test.update

## 抛出事件

```js
//调用形式 facade.current.notifyEvent(事件调用名称, 事件参数对象)，如下例：
facade.current.notifyEvent('test.update', {test:this})
```

## 响应事件

在相应的事件处理文件中书写事件处理代码，如下所示：

```js
function handle(event) { // event 就是传入的事件参数对象
    console.log(event);
}
```