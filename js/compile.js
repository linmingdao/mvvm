function Compile(el, vm) {
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        this.$fragment = this.node2Fragment(this.$el);
        this.init();
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    constructor: Compile,
    node2Fragment(el) {
        var fragment = document.createDocumentFragment(),
            child;

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init() {
        this.compileElement(this.$fragment);
    },

    compileElement(el) {
        var childNodes = el.childNodes,
            me = this;

        [].slice.call(childNodes).forEach(function(node) {
            var text = node.textContent;
            var reg = /\{\{(.*)\}\}/;

            if (me.isElementNode(node)) {
                // 是元素节点, 先编译自身, 后面会递归编该元素节点的所有子元素
                me.compile(node);

            } else if (me.isTextNode(node) && reg.test(text)) {
                // 元素的文本内容含有表达式: {{}} , 则编译表达式, 这里只是实现了 第一个子匹配, 
                // 即无法支持多个表达式: <p>{{ getHelloWord }} {{ xxx }}</p>
                me.compileText(node, RegExp.$1.trim());
            }

            if (node.childNodes && node.childNodes.length) {
                // 递归编译所有子节点
                me.compileElement(node);
            }
        });
    },

    compile(node) {
        var nodeAttrs = node.attributes,
            me = this;

        [].slice.call(nodeAttrs).forEach(function(attr) {
            var attrName = attr.name;
            if (me.isDirective(attrName)) {
                var exp = attr.value;
                var dir = attrName.substring(2);
                // 事件指令
                if (me.isEventDirective(dir)) {
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                    // 普通指令
                } else {
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }

                node.removeAttribute(attrName);
            }
        });
    },

    compileText(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode(node) {
        return node.nodeType == 1;
    },

    isTextNode(node) {
        return node.nodeType == 3;
    }
};

// 指令处理集合
var compileUtil = {
    text(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        var me = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },

    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    bind(node, vm, exp, dir) {
        // 获取更新视图的函数
        var updaterFn = updater[dir + 'Updater'];

        // 初始化一次视图
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

        // new Watcher() 会设置 Dep.target = 刚刚创建的 Watcher
        new Watcher(vm, exp, function(value, oldValue) {
            // 更新视图
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    _getVMVal(vm, exp) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });

        return val;
    },

    _setVMVal(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};

// 视图更新器
var updater = {
    textUpdater(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    htmlUpdater(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    classUpdater(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },

    modelUpdater(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};