# vue.js源码解析

## debug

1. 找到build/config.js 

2. 找到 genConfig 方法,添加 sourceMap:true

```js
...
function genConfig (name) {
  const opts = builds[name]
  const config = {
    input: opts.entry,
    external: opts.external,
    sourceMap: true,
...
```

3. 修改example里面引用, 比如 example/commits/index.html 

```js
<script src="../../dist/vue.js"></script>
```

4. 执行 npm run dev

5. 在需要打断点地方加入 debugger即可

## 入口文件

[src/core/instance/index.js](src/core/instance/index.js)

## 双向数据绑定

![](https://github.com/lixiang/vue/blob/3f9e263babd12d324ff226078fee7d4d83b2b6f1/img/vue1.jpg)

核心 `Object.defineProperty()`

实现分为3部分

1. `Observer（监听器）`: 递归的监听所有的对象属性，如果属性值有变化，触发其`watcher`

2. `Watcher（观察者）`: 当监听属性值有变化，则执行相应回调函数，更新vue模板

3. `Dep（订阅者）`: 负责连接 `observer`和 `watcher` ，一个`observe`对应一个`dep`，内部维护一个数组，用来保存该`observer`和相关`watcher`



源码分别在 

observer: [core/observer/index.js](https://github.com/lixiang/vue/blob/63bf4334664117f3c462964878dcbc2cad51c0c7/src/core/observer/index.js)

watcher:[core/observer/watcher.js](https://github.com/lixiang/vue/blob/63bf4334664117f3c462964878dcbc2cad51c0c7/src/core/observer/watcher.js)

dep:[core/observer/dep.js](https://github.com/lixiang/vue/blob/63bf4334664117f3c462964878dcbc2cad51c0c7/src/core/observer/dep.js)

## 模板解析

实现也分为3部分

1. `parse`:parse会用正则方式将 `template`模板里进行字符串解析，得到指令，class，style等数据，形成`AST`.

`parse-text` : `tokens` 数组来存放解析结果，通过 `defaultTagRE` 来循环匹配该文本，如果是普通文本直接 push 到 tokens 数组中去，如果是表达式`（{{item}}）`，则转化成“`_s(${exp})`”的形式
比如
```js
<div>hello,{{name}}.</div>
```
得到`token`为
```js
tokens = ['hello,', _s(name), '.'];
```
最终通过 `join` 返回表达式
```js
最终通过 join 返回表达式
```




2. `optimize`:优化代码. 将一些静态节点标记,在后面的`patch`环节直接跳过,达到优化目的
3. `generate`:将优化后的`AST` 转化成`render function`.

源码在
[src/compiler/index.js](https://github.com/lixiang/vue/blob/9e3c18a3e5beecd8ded269f110852698dacc6eb5/src/compiler/index.js)



###parse-lite 模板解析精简版

```html
<div :class="c" class="demo" v-if="isShow"><span v-for="item in sz">{{item}}</span><span>test</span></div>
```
通过parseHTML方法解析 标签 class style 指令 text 为 AST为:

```js
{
    type:1,
    tag:"div",
    parent:null,
    attrsList:[
        {
            name:":class",
            value:"c"
        },{
            name:"class",
            value:"demo"
        }
    ],
    attrsMap:{
        :class:"c",
        class:"demo",
        v-if:"isShow"
    },
    if:"isShow",
    ifProcessed:true,
    ifConditions:[
        {
            exp:"isShow",
            ...
        }
    ],
    children:[
        {
            type:1,
            tag:"span",
            parent:...,
            attrsList:[],
            attrsMap:{
                v-for:"item in sz"
            },
            alias:"item",
            for:"sz",
            forProcessed:true,
            children:[
                {
                    type:2,
                    expression:"_s(item)",
                    text:"{{item}}"
                }
            ],
            ...
        },
        {
            type:1,
            tag:"span",
            parent:...,
            attrsList:[],
            attrsMap:{},
            children:[
                {
                    type:3,
                    text:"test"
                }
            ]
            ...
        }
    ]
}
```
通过optimize 优化AST,将一些静态节点标记,optimize后AST为

```js
{
    type:1,
    tag:"div",
    parent:null,
    static:false,
    staticRoot:false,
    attrsList:[
        {
            name:":class",
            value:"c"
        },{
            name:"class",
            value:"demo"
        }
    ],
    attrsMap:{
        :class:"c",
        class:"demo",
        v-if:"isShow"
    },
    if:"isShow",
    ifProcessed:true,
    ifConditions:[
        {
            exp:"isShow",
            ...
        }
    ],
    children:[
        {
            type:1,
            tag:"span",
            static:false,
            parent:...,
            attrsList:[],
            attrsMap:{
                v-for:"item in sz"
            },
            alias:"item",
            for:"sz",
            forProcessed:true,
            children:[
                {
                    type:2,
                    static:false,
                    expression:"_s(item)",
                    text:"{{item}}"
                }
            ],
            ...
        },
        {
            type:1,
            tag:"span",
            parent:...,
            attrsList:[],
            attrsMap:{},
            children:[
                {
                    type:3,
                    static:true,
                    text:"test"
                }
            ]
            ...
        }
    ]
}
```
通过generate 转化为render function
```js
with(this){return (isShow)?_c('div,'{
  staticClass: c,
  class: demo,
},_l((sz),function(item){return _c('span,'{
  staticClass: undefined,
  class: undefined,
},_v(_s(item)))}),_c('span,'{
  staticClass: undefined,
  class: undefined,
},_v(undefined))): _e()}
```

`_c`:createElement创建节点
`_l`:循环表达式
`_v`:创建文本节点
`_s`:值转为字符串
`_e`: 空节点

## VDom

vue.js VDom 这块基于 [snabbdom](https://github.com/snabbdom/snabbdom) 实现，并做了优化
