# vue.js源码解析

## debug

1. 找到build/config.js 

2.找到 genConfig 方法,添加 sourceMap:true

```js
...
function genConfig (name) {
  const opts = builds[name]
  const config = {
    input: opts.entry,
    external: opts.external,
    souceMap: true,
...
```

3.修改example里面引用, 比如 example/commits/index.html 

```js
<script src="../../dist/vue.js"></script>
```

4.执行 npm run dev

5.在需要打断点地方加入 debugger即可

## 入口文件

[src/core/instance/index.js](src/core/instance/index.js)

## 双向数据绑定

![](https://github.com/lixiang/vue/blob/3f9e263babd12d324ff226078fee7d4d83b2b6f1/img/vue1.jpg)

核心 `Object.defineProperty()`

实现分为3部分

1.`Observer（监听器）`: 递归的监听所有的对象属性，如果属性值有变化，触发其`watcher`

2.`Watcher（观察者）`: 当监听属性值有变化，则执行相应回调函数，更新vue模板

3.`Dep（订阅者）`: 负责连接 `observer`和 `watcher` ，一个`observe`对应一个`dep`，内部维护一个数组，用来保存该`observer`和相关`watcher`



源码分别在 

observer: [core/observer/index.js](https://github.com/lixiang/vue/blob/63bf4334664117f3c462964878dcbc2cad51c0c7/src/core/observer/index.js)

watcher:[core/observer/watcher.js](https://github.com/lixiang/vue/blob/63bf4334664117f3c462964878dcbc2cad51c0c7/src/core/observer/watcher.js)

dep:[core/observer/dep.js](https://github.com/lixiang/vue/blob/63bf4334664117f3c462964878dcbc2cad51c0c7/src/core/observer/dep.js)

## 模板解析

## Vdom