function MVVM(options) {
    this.$options = options || {};
    var data = this._data = this.$options.data;
    var me = this;

    // 数据代理, 实现 vm.xxx -> vm._data.xxx
    Object.keys(data).forEach(function(key) {
        me._proxyData(key);
    });

    this._initComputed();

    // 数据劫持, 实现: Model -> View
    observe(data, this);

    this.$compile = new Compile(options.el || document.body, this);
}

MVVM.prototype = {
    constructor: MVVM,

    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    /**
     * 将 Model 代理到 vm 上, 实现 在 methods 里可以直接通过 this.xxx 访问 or 设置 Model
     * @param {*} key 
     * @param {*} setter 
     * @param {*} getter 
     */
    _proxyData: function(key, setter, getter) {
        var me = this;
        setter = setter || 
        Object.defineProperty(me, key, {
            configurable: false,
            enumerable: true,
            get: function proxyGetter() {
                return me._data[key];
            },
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    },

    _initComputed: function() {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function(key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function' 
                            ? computed[key] 
                            : computed[key].get,
                    set: function() {}
                });
            });
        }
    }
};