const ncname = '[a-zA-Z_][\\w\\-\\.]*'
const qnameCapture = '((?:' + ncname + '\\:)?' + ncname + ')'
const endTag = new RegExp('^<\\/' + qnameCapture + '[^>]*>')

const startTagOpen = new RegExp('^<' + qnameCapture)
const startTagClose = /^\s*(\/?)>/

const singleAttrIdentifier = /([^\s"'<>/=]+)/
const singleAttrAssign = /(?:=)/
const singleAttrValues = [
  /"([^"]*)"+/.source,
  /'([^']*)'+/.source,
  /([^\s"'=<>`]+)/.source
]

const attribute = new RegExp(
  '^\\s*' +
    singleAttrIdentifier.source +
    '(?:\\s*(' +
    singleAttrAssign.source +
    ')' +
    '\\s*(?:' +
    singleAttrValues.join('|') +
    '))?'
)

const forAliasRE = /(.*?)\s+(?:in|of)\s+(.*)/

const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g

let index = 0
let html = ''
let text = ''
const stack = []

let currentParent, root

// _______________________________________________________________________________
// ___________________________________parse 流程__________________________________
// _______________________________________________________________________________

function advance (n) {
  index += n
  html = html.substring(n)
}

function parse (html) {
  html = html
  return parseHTML()
}

function parseHTML () {
  while (html) {
    const textEnd = html.indexOf('<') // 开始解析<
    if (textEnd === 0) {
      const endTagMatch = html.match(endTag) // 解析结束标签
      if (endTagMatch) {
        advance(endTagMatch[0].length)
        parseEndTag(endTagMatch[1])
        continue
      }

      if (html.match(startTagOpen)) {
        const startTagMatch = parseStartTag() // 解析起始标签
        const element = {
          type: 1,
          tag: startTagMatch.tagName,
          lowerCaseTag: startTagMatch.tagName.toLowerCase(),
          attrsList: startTagMatch.attrs,
          attrsMap: makeAttrsMap(startTagMatch.attrs),
          parent: currentParent,
          children: []
        }

        processIf(element) // 解析if指令
        processFor(element) // 解析for指令

        if (!root) {
          root = element
        }

        if (currentParent) {
          currentParent.children.push(element)
        }

        stack.push(element)
        currentParent = element
        continue
      }
    } else {
      debugger
      // 解析text内容
      text = html.substring(0, textEnd)
      advance(textEnd)
      let expression
      if ((expression = parseText(text))) {
        // 带有表达式的文本 {{}}
        currentParent.children.push({
          type: 2,
          text,
          expression
        })
      } else {
        // 普通文本
        currentParent.children.push({
          type: 3,
          text
        })
      }
      continue
    }
  }
  return root
}

function parseEndTag (tagName) {
  let pos
  for (pos = stack.length - 1; pos >= 0; pos--) {
    if (stack[pos].lowerCaseTag === tagName.toLowerCase()) {
      break
    }
  }

  if (pos >= 0) {
    if (pos > 0) {
      currentParent = stack[pos - 1]
    } else {
      currentParent = null
    }
    stack.length = pos
  }
}

function parseStartTag () {
  const start = html.match(startTagOpen)
  if (start) {
    const match = {
      tagName: start[1], // 标签名
      attrs: [], // 属性 数组
      start: index // 开始index
    }
    advance(start[0].length)

    let end, attr
    // while  循环解析 标签内属性 直到解析到标签闭合标示为止
    while (
      !(end = html.match(startTagClose)) &&
      (attr = html.match(attribute))
    ) {
      advance(attr[0].length)
      match.attrs.push({ name: attr[1], value: attr[3] })
    }

    if (end) {
      match.unarySlash = end[1]
      advance(end[0].length)
      match.end = index
      return match
    }
  }
}

function makeAttrsMap (attrs) {
  const map = {}
  for (let index = 0; index < attrs.length; index++) {
    map[attrs[index].name] = attrs[index].value
  }
  return map
}

function processIf (el) {
  const exp = getAndRemoveAttr(el, 'v-if')
  if (exp) {
    el.if = exp
    if (!el.ifConditions) {
      el.ifConditions = []
    }
    el.ifConditions.push({
      exp,
      block: el
    })
  }
}

function processFor (el) {
  let exp
  if ((exp = getAndRemoveAttr(el, 'v-for'))) {
    const inMatch = exp.match(forAliasRE)
    el.for = inMatch[2].trim()
    el.alias = inMatch[1].trim()
  }
}

function getAndRemoveAttr (el, name) {
  let val
  if ((val = el.attrsMap[name]) != null) {
    const list = el.attrsList
    for (let i = 0; (l = list.length); i < l, i++) {
      if (list[i].name === name) {
        list.splice(i, 1)
        break
      }
    }
  }
  return val
}

function parseText (text) {
  if (!defaultTagRE.test(text)) return

  const tokens = []
  let lastIndex = (defaultTagRE.lastIndex = 0)
  let match, index
  while ((match = defaultTagRE.exec(text))) {
    index = match.index

    if (index > lastIndex) {
      tokens.push(JSON.stringify(text.slice(lastIndex, index)))
    }

    const exp = match[1].trim()
    tokens.push(`_s(${exp})`)
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    tokens.push(JSON.stringify(text.slice(lastIndex)))
  }
  return tokens.join('+')
}

// _______________________________________________________________________________
// ___________________________________optimize 流程________________________________
// _______________________________________________________________________________

function optimize (rootAst) {
  markStatic(rootAst)
  markStaticRoots(rootAst)

  function isStatic (node) {
    if (node.type === 2) {
      return false
    }
    if (node.type === 3) {
      return true
    }
    return !node.type && !node.for
  }

  function markStatic (node) {
    node.static = isStatic(node)
    if (node.type === 1) {
      for (let index = 0; index < node.children.length; index++) {
        const child = node.children[index]
        markStatic(child)
        if (!child.static) {
          node.static = false
        }
      }
    }
  }

  function markStaticRoots (node) {
    if (node.type === 1) {
      if (
        node.static &&
        node.children.length &&
        !(node.children.length === 1) &&
        node.children[0].type === 3
      ) {
        node.staticRoot = true
      } else {
        node.staticRoot = false
      }
    }
  }
}
// _______________________________________________________________________________
// ___________________________________generate code 流程___________________________
// _______________________________________________________________________________

function generate (rootAst) {
  function genIf (el) {
    el.ifProcessed = true
    if (!el.ifConditions.length) {
      return '_e()'
    }
    return `(${el.ifConditions[0].exp})?${genElement(el.ifConditions[0].block)}: _e()`
  }

  function genFor (el) {
    el.forProcessed = true

    const exp = el.for
    const alias = el.alias
    const iterator1 = el.iterator1 ? `,${el.iterator1}` : ''
    const iterator2 = el.iterator2 ? `,${el.iterator2}` : ''

    return (
      `_l((${exp}),` +
      `function(${alias}${iterator1}${iterator2}){` +
      `return ${genElement(el)}` +
      '})'
    )
  }

  function genText (el) {
    return `_v(${el.expression})`
  }

  function genNode (el) {
    if (el.type === 1) {
      return genElement(el)
    } else {
      return genText(el)
    }
  }

  function genChildren (el) {
    const children = el.children

    if (children && children.length > 0) {
      return `${children.map(genNode).join(',')}`
    }
  }

  function genElement (el) {
    if (el.if && !el.ifProcessed) {
      return genIf(el)
    } else if (el.for && !el.forProcessed) {
      return genFor(el)
    } else {
      const children = genChildren(el)
      const code = `_c('${el.tag},'{
              staticClass: ${el.attrsMap && el.attrsMap[':class']},
              class: ${el.attrsMap && el.attrsMap['class']},
          }${children ? `,${children}` : ''})`
      return code
    }
  }

  const code = rootAst ? genElement(rootAst) : '_c("div")'
  return {
    render: `with(this){return ${code}}`
  }
}

// _______________________________________________________________________________
// ___________________________________入口_________________________________________
// _______________________________________________________________________________
html =
  '<div :class="c" class="demo" v-if="isShow"><span v-for="item in sz">{{item}}</span><span>test</span></div>'
const ast = parse(html)
console.log(ast)
optimize(ast)
console.log(ast)
const code = generate(ast)
console.log(code)
