# vue.js源码解析

## debug

1.定位 build/config.js 

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

`src/core/instance/index.js`
