// TEMPORARY
qx.Class.define(
  "qx.lang.Type",
  {
    type : "static",

    statics :
    {
      getClass : qx.Bootstrap.getClass,
      isString : qx.Bootstrap.isString,
      isArray : qx.Bootstrap.isArray,
      isObject : qx.Bootstrap.isObject,
      isFunction : qx.Bootstrap.isFunction,
      isFunctionOrAsyncFunction : qx.Bootstrap.isFunctionOrAsyncFunction,

      isRegExp(value)
      {
        return this.getClass(value) === "RegExp";
      },

      isNumber(value)
      {
        return (
          value !== null &&
            (this.getClass(value) === "Number" || value instanceof Number)
        );
      },

      isBoolean(value)
      {
        return (
          value !== null &&
            (this.getClass(value) === "Boolean" ||
             value instanceof Boolean)
        );
      },

      isDate(value)
      {
        return (
          value !== null &&
            (this.getClass(value) === "Date" || value instanceof Date)
        );
      },

      isError(value)
      {
        return (
          value !== null &&
            (this.getClass(value) === "Error" || value instanceof Error)
        );
      },

      isPromise(value)
      {
        return value != null && this.isFunction(value.then);
      }
    }
  });
