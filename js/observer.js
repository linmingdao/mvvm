function Observer(data) {
    this.data = data;
    this.walk(data);
}

Observer.prototype = {
    constructor: Observer,

    walk(data) {
        var me = this;
        Object.keys(data).forEach(function(key) {
            me.convert(key, data[key]);
        });
    },

    convert(key, val) {
        this.defineReactive(this.data, key, val);
    },

    defineReactive(data, key, val) {
        var dep = new Dep();
        var childObj = observe(val);

        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define

            get() {
                if (Dep.target) {
                    // 这里收集了依赖
                    dep.depend();
                }

                return val;
            },

            set(newVal) {
                if (newVal === val) {
                    return;
                }
                val = newVal;
                
                // 新的值是object的话，进行监听
                childObj = observe(newVal);

                // 通知订阅者, 这里实现了单向数据绑定: Model -> View
                dep.notify();
            }
        });
    }
};

function observe(value, vm) {
    if (!value || typeof value !== 'object') {
        return;
    }

    return new Observer(value);
};


var uid = 0;

/**
 * 依赖收集
 */
function Dep() {
    this.id = uid++;
    this.subs = [];
}

Dep.prototype = {
    addSub(sub) {
        this.subs.push(sub);
    },

    depend() {
        Dep.target.addDep(this);
    },

    removeSub(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    notify() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};

// 注意这里是一个静态的属性
Dep.target = null;