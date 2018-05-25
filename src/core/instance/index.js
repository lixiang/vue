import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  // 首先判断如果是不是生产环境，且不是通过new关键字来创建对象的话，就在控制台打印一个warning
  if (process.env.NODE_ENV !== 'production' && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue) // _init
stateMixin(Vue) // $set、$delete、$watch
eventsMixin(Vue) // $on、$once、$off、$emit
lifecycleMixin(Vue) // _update、$forceUpdate、$destroy
renderMixin(Vue) // $nextTick、_render、以及多个内部调用的方法

export default Vue
