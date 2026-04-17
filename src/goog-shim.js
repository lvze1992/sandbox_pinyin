(function bootstrapClosureShim(global) {
  if (global.goog && global.goog.__sandboxChineseImeShim) {
    return;
  }

  const goog = global.goog || {};
  goog.__sandboxChineseImeShim = true;

  function exportPath(name) {
    const parts = name.split('.');
    let cursor = global;
    for (const part of parts) {
      cursor[part] = cursor[part] || {};
      cursor = cursor[part];
    }
    return cursor;
  }

  goog.provide = exportPath;
  goog.require = function requireNoop() {};
  goog.isArray = Array.isArray;

  goog.bind = function bind(fn, self, ...boundArgs) {
    return function boundFn(...args) {
      return fn.apply(self, boundArgs.concat(args));
    };
  };

  goog.inherits = function inherits(childCtor, parentCtor) {
    childCtor.superClass_ = parentCtor.prototype;
    childCtor.prototype = Object.create(parentCtor.prototype);
    childCtor.prototype.constructor = childCtor;
  };

  goog.base = function base(me, ...args) {
    const superCtor = me.constructor.superClass_ && me.constructor.superClass_.constructor;
    if (superCtor) {
      superCtor.apply(me, args);
    }
  };

  goog.array = {
    clone(arr) {
      return arr ? Array.prototype.slice.call(arr, 0) : [];
    },
    clear(arr) {
      arr.length = 0;
    },
    compare3(a, b) {
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i += 1) {
        if (a[i] < b[i]) {
          return -1;
        }
        if (a[i] > b[i]) {
          return 1;
        }
      }
      return a.length - b.length;
    },
    binarySearch(arr, target, comparator) {
      const compare = comparator || ((a, b) => (a > b ? 1 : a < b ? -1 : 0));
      let left = 0;
      let right = arr.length - 1;
      while (left <= right) {
        const mid = (left + right) >> 1;
        const result = compare(arr[mid], target);
        if (result < 0) {
          left = mid + 1;
        } else if (result > 0) {
          right = mid - 1;
        } else {
          return mid;
        }
      }
      return -left - 1;
    },
    filter(arr, fn, self) {
      return Array.prototype.filter.call(arr, fn, self);
    },
    findIndex(arr, fn, self) {
      for (let i = 0; i < arr.length; i += 1) {
        if (fn.call(self, arr[i], i, arr)) {
          return i;
        }
      }
      return -1;
    },
    isEmpty(arr) {
      return !arr || arr.length === 0;
    },
    reduce(arr, fn, initial, self) {
      let value = initial;
      for (let i = 0; i < arr.length; i += 1) {
        value = fn.call(self, value, arr[i], i, arr);
      }
      return value;
    },
    removeAt(arr, index) {
      if (index < 0 || index >= arr.length) {
        return false;
      }
      arr.splice(index, 1);
      return true;
    },
    some(arr, fn, self) {
      return Array.prototype.some.call(arr, fn, self);
    }
  };

  goog.object = {
    clone(obj) {
      return Object.assign({}, obj);
    },
    containsKey(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    },
    getKeys(obj) {
      return Object.keys(obj);
    },
    getValues(obj) {
      return Object.keys(obj).map((key) => obj[key]);
    },
    isEmpty(obj) {
      return Object.keys(obj).length === 0;
    }
  };

  goog.Disposable = function Disposable() {};
  goog.Disposable.prototype.dispose = function dispose() {
    if (typeof this.disposeInternal === 'function') {
      this.disposeInternal();
    }
  };
  goog.Disposable.prototype.disposeInternal = function disposeInternal() {};

  goog.events = goog.events || {};
  goog.events.EventTarget = function EventTarget() {
    this.__listeners = {};
  };
  goog.events.EventTarget.prototype.addEventListener = function addEventListener(type, listener) {
    this.__listeners[type] = this.__listeners[type] || [];
    this.__listeners[type].push(listener);
  };
  goog.events.EventTarget.prototype.removeEventListener = function removeEventListener(type, listener) {
    const listeners = this.__listeners[type];
    if (!listeners) {
      return;
    }
    const index = listeners.indexOf(listener);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  };
  goog.events.EventTarget.prototype.dispatchEvent = function dispatchEvent(event) {
    const type = typeof event === 'string' ? event : event.type;
    const listeners = this.__listeners[type] || [];
    for (const listener of listeners.slice()) {
      listener.call(this, event);
    }
    return true;
  };

  goog.events.EventHandler = function EventHandler(scope) {
    this.scope_ = scope;
    this.listeners_ = [];
  };
  goog.events.EventHandler.prototype.listen = function listen(target, type, listener) {
    const bound = listener.bind(this.scope_);
    target.addEventListener(type, bound);
    this.listeners_.push({ target, type, bound });
  };
  goog.events.EventHandler.prototype.dispose = function dispose() {
    for (const item of this.listeners_) {
      item.target.removeEventListener(item.type, item.bound);
    }
    this.listeners_ = [];
  };

  goog.structs = goog.structs || {};
  goog.structs.Node = function Node(key, value) {
    this.key_ = key;
    this.value_ = value;
  };
  goog.structs.Node.prototype.getKey = function getKey() {
    return this.key_;
  };
  goog.structs.Node.prototype.getValue = function getValue() {
    return this.value_;
  };

  global.goog = goog;
})(window);
