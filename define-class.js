let qx =
    {
      Bootstrap :
      {
        /**
         * Mapping from JavaScript string representation of objects to names
         * @internal
         * @type {Map}
         */
        __classToTypeMap: {
          "[object String]": "String",
          "[object Array]": "Array",
          "[object Object]": "Object",
          "[object RegExp]": "RegExp",
          "[object Number]": "Number",
          "[object Boolean]": "Boolean",
          "[object Date]": "Date",
          "[object Function]": "Function",
          "[object AsyncFunction]": "Function",
          "[object Error]": "Error",
          "[object Blob]": "Blob",
          "[object ArrayBuffer]": "ArrayBuffer",
          "[object FormData]": "FormData"
        },

        getClass : getClass,
        isString : isString,
        isArray : isArray,
        isObject : isObject,
        isFunction : isFunction,
        isFunctionOrAsyncFunction : isFunctionOrAsyncFunction,

        getDisplayName(f)
        {
          return f.$$displayName || "<non-qooxdoo>";
        },

        setDisplayName(f, classname, name)
        {
          if (name)
          {
            f.$$displayName = `${classname}.${name}()`;
          }
          else
          {
            f.$$displayName = `${classname}()`;
          }
        }
      },

      Class :
      {
        define : define
      },

      core :
      {
        Aspect :
        {
          wrap(f)
          {
            return f;
          }
        },

        Environment :
        {
          $$environment :
          {
            "qx.debug" : true
          },

          get(key)
          {
            return qx.core.Environment.$$environment[key];
          },

          add(key, value)
          {
            qx.core.Environment.$$environment[key] = value;
          }
        }
      },

      lang :
      {
        Type :
        {
          getClass: getClass,
          isString: isString,
          isArray: isArray,
          isObject: isObject,
          isFunction: isFunction,
          isFunctionOrAsyncFunction: isFunctionOrAsyncFunction,

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
      },

      Promise : Promise
    };

/**
 * Supported keys for property definitions
 *
 * @internal
 */
let stringOrFunction = [ "string", "function" ];
let $$allowedPropKeys =
    {
      "@": null,                  // Anything
      name: "string",             // String
      dereference: "boolean",     // Boolean
      inheritable: "boolean",     // Boolean
      nullable: "boolean",        // Boolean
      themeable: "boolean",       // Boolean
      refine: "boolean",          // Boolean
      init: null,                 // var
      apply: stringOrFunction,    // String, Function
      event: "string",            // String
      check: null,                // Array, String, Function
      transform: null,            // String, Function
      async: "boolean",           // Boolean
      deferredInit: "boolean",    // Boolean
      validate: stringOrFunction, // String, Function
      isEqual: stringOrFunction,  // String, Function

      // Not in original set of allowed keys:
      readonly: "boolean",        // Boolean
      get: stringOrFunction,      // String, Function
      initFunction: "function",   // Function
      storage: "object"           // Map
    };

/**
 * Supported keys for property group definitions
 *
 * @internal
 */
let $$allowedPropGroupKeys =
    {
      "@": null,                  // Anything
      name: "string",             // String
      group: "object",            // Array
      mode: "string",             // String
      themeable: "boolean"        // Boolean
    };

/**
 * Deprecated keys for properties, that we want to warn about
 *
 * @internal
 */
let $$deprecatedPropKeys =
    {
      deferredInit :
        `'deferredInit' is deprecated and ignored. ` +
        `See the new property key 'initFunction' as a likely replacement.`
    };

let $$checks = new Map(
  [
    [
      "Boolean",
      v => qx.lang.Type.isBoolean(v)
    ],
    [
      "String",
      v => qx.lang.Type.isString(v)
    ],
    [
      "Number",
      v => qx.lang.Type.isNumber(v) && isFinite(v)
    ],
    [
      "Integer",
      v => qx.lang.Type.isNumber(v) && isFinite(v) && v % 1 === 0
    ],
    [
      "PositiveNumber",
      v => qx.lang.Type.isNumber(v) && isFinite(v) && v >= 0
    ],
    [
      "PositiveInteger",
      v => qx.lang.Type.isNumber(v ) && isFinite() && v % 1 === 0 && v >= 0
    ],
    [
      "Error",
      v => v instanceof Error
    ],
    [
      "RegExp",
      v => v instanceof RegExp
    ],
    [
      "Object",
      v => v !== null && (qx.lang.Type.isObject(v) || typeof v === "object")
    ],
    [
      "Array",
      v => qx.lang.Type.isArray(v)
    ],
    [
      "Map",
      v => qx.lang.Type.isObject(v)
    ],
    [
      "Function",
      v => qx.lang.Type.isFunction(v)
    ],
    [
      "Date",
      v => v instanceof Date
    ],
    [
      "Node",
      v => v !== null && v.nodeType !== undefined
    ],
    [
      "Element",
      v => v !== null && v.nodeType === 1 && v.attributes
    ],
    [
      "Document",
      v => v !== null && v.nodeType === 9 && v.documentElement
    ],
    [
      "Window",
      v => v !== null && v.document
    ],
    [
      "Event",
      v => v !== null && v.type !== undefined
    ],
    [
      "Class",
      v => v !== null && v.$$type === "Class"
    ],
    [
      "Mixin",
      v => v !== null && v.$$type === "Mixin"
    ],
    [
      "Interace",
      v => v !== null && v.$$type === "Interface"
    ],
    [
      "Theme",
      v => v !== null && v.$$type === "Theme"
    ],
    [
      "Color",
      v => (qx.lang.Type.isString(v) &&
           qx.util.ColorUtil.isValidPropertyValue(v))
    ],
    [
      "Decorator",
      v => (v !== null &&
           qx.theme.manager.Decoration.getInstance().isValidPropertyValue(v))
    ],
    [
      "Font",
      v => v !== null && qx.theme.manager.Font.getInstance().isDynamic(v)
    ]
  ]);

let isEqual = (a, b) => a === b;

function define(className, config)
{
  let             allowedKeys;
  let             clazz;
  let             proxy;
  let             handler;
  let             path;
  let             classnameComponents;

  if (qx.core.Environment.get("qx.debug"))
  {
    __validatePropertyDefinitions(className, config);
  }

  if (! config.extend)
  {
    if (qx.core.Environment.get("qx.debug"))
    {
      if (config.type && config.type != "static")
      {
        throw new Error(
          `${className}: ` +
            `No 'extend' key, but 'type' is not 'static' ` +
            `(found ${config.type})`);
      }
      else if (! config.type)
      {
        console.log(`${className}: No 'extend' key; assuming type: 'static'`);
      }
    }

    config.type = "static";
  }

  if (qx.core.Environment.get("qx.debug"))
  {
    if (config.type == "static")
    {
      allowedKeys =
        {
          "@": "object",
          type: "string",         // String
          include: "object",      // Mixin[]
          statics: "object",      // Map
          environment: "object",  // Map
          events: "object",       // Map
          defer: "function"       // Function
        };
    }
    else
    {
      allowedKeys =
        {
          "@": "object",
          "@construct": "object",
          "@destruct": "object",
          type: "string",         // String
          extend: "function",     // Function
          implement: "object",    // Interface[]
          include: "object",      // Mixin[]
          construct: "function",  // Function
          statics: "object",      // Map
          properties: "object",   // Map
          members: "object",      // Map
          environment: "object",  // Map
          events: "object",       // Map
          defer: "function",      // Function
          destruct: "function",    // Function
          proxyHandler: "object"   // Map
        };
    }

    Object.keys(config).forEach(
      (key) =>
      {
        // Ensure this key is allowed
        if (! (key in allowedKeys))
        {
          if (config.type == "static")
          {
            throw new Error(
              `${className}: ` +
                `disallowed key in static class configuration: ${key}`);
          }
          else
          {
            throw new Error(
              `${className}: ` +
                `unrecognized key in class configuration: ${key}`);
          }
        }

        // Ensure its value is of the correct type
        if (typeof config[key] != allowedKeys[key])
        {
          throw new Error(
            `${className}: ` +
              `typeof value for key ${key} must be ${allowedKeys[key]}; ` +
              `found ${typeof config[key]}`);
        }
      });
  }

  clazz = _extend(className, config);

  // Initialise class and constructor/destructor annotations
  ["@", "@construct", "@destruct"].forEach(
    (id) =>
    {
      __attachAnno(clazz, id, null, config[id]);
    });

  // Add singleton getInstance()
  if (config.type === "singleton")
  {
    clazz.getInstance = getInstance;
  }

  clazz.classname = className;
  qx.Bootstrap.setDisplayName(clazz, className, "constructor");

  // Attach toString
  if (! clazz.hasOwnProperty("toString"))
  {
    clazz.toString = function()
    {
      return `[Class ${clazz.classname}]`;
    };
  }

  // Add statics
  for (let key in (config.statics || {}))
  {
    let             staticFunc;

    if (qx.core.Environment.get("qx.debug"))
    {
      if (key.charAt(0) === "@")
      {
        if (config.statics[key.substring(1)] === undefined)
        {
          throw new Error(
            'Annonation for static "' +
              key.substring(1) +
              '" of Class "' +
              clazz.classname +
              '" does not exist!');
        }

        if (key.charAt(1) === "_" && key.charAt(2) === "_")
        {
          throw new Error(
            'Cannot annotate private static "' +
              key.substring(1) +
              '" of Class "' +
              clazz.classname);
        }
      }
    }

    // Do not add annotations as class properties
    if (key.charAt(0) === "@")
    {
      continue;
    }

    staticFunc = config.statics[key];
    if (qx.core.Environment.get("qx.aspects"))
    {
      staticFunc =
        qx.core.Aspect.wrap(className, staticFunc, "static");
    }

    // Add this static as a class property
    Object.defineProperty(
      clazz,
      key,
      {
        value        : staticFunc,
        writable     : true,
        configurable : true,
        enumerable   : true
      });

    // Attach annotations
    __attachAnno(clazz, "statics", key, config.statics["@" + key]);
  }

  // Add a method to refresh all inheritable properties
  Object.defineProperty(
    clazz.prototype,
    "refresh",
    {
      value        : function()
      {
        let             allProperties = this.constructor.$$allProperties;

        // Call the refresh method of each inheritable property
        for (let prop in allProperties)
        {
          let             property = allProperties[prop];

          if (property.inheritable)
          {
            let             propertyFirstUp =
                prop[0].toUpperCase() + prop.substr(1);

            // Call this property's refresh method
            this[`refresh${propertyFirstUp}`]();
          }
        }
      },
      writable     : false,
      configurable : false,
      enumerable   : false
    });



  // Add members
  for (let key in (config.members || {}))
  {
    let             member = config.members[key];

    // Annotations are not members
    if (key.charAt(0) === "@")
    {
      let annoKey = key.substring(1);
      if (member[annoKey] === undefined)
      {
        // An annotation for a non-existent member.
        // SHOULD THIS BE ALLOWED?
        __attachAnno(clazz, "members", annoKey, member[key]);
      }

      continue;
    }

    if (typeof member == "function")
    {
      // Allow easily identifying this method
      qx.Bootstrap.setDisplayName(member, className, key);

      if (qx.core.Environment.get("qx.aspects"))
      {
        member = qx.core.Aspect.wrap(className, member, key);
      }

      // Allow base calls
      if (key in clazz.prototype)
      {
        member.base = clazz.prototype[key];
      }
    }

    // Create the storage for this member
    Object.defineProperty(
      clazz.prototype,
      key,
      {
        value        : member,
        writable     : true,
        configurable : true,
        enumerable   : true
      });

    // Attach annotations
    __attachAnno(clazz, "members", key, config.members["@" + key]);
  }

  // Process environment
  let environment = config.environment || {};
  for (let key in config.environment)
  {
    qx.core.Environment.add(key, config.environment[key]);
  }

  // Add properties
  let properties = config.properties || {};
  for (let key in properties)
  {
    let             property = properties[key];
    let             propertyFirstUp = key[0].toUpperCase() + key.substr(1);
    let             storage;

    // If there's no comparison function specified for this property...
    if (! property.isEqual)
    {
      // ... then create the default comparison function
      property.isEqual = isEqual;
    }

    // If there's no storage mechanism specified for this property...
    if (! property.storage)
    {
      // ... then create the default storage mechanism for it
      property.storage =
        {
          init(propertyName, property)
          {
            Object.defineProperty(
              clazz.prototype,
              key,
              {
                value        : property.init,
                writable     : true, // must be true for possible initFunction
                configurable : false,
                enumerable   : false
              });
          },

          get(prop)
          {
            return this[prop];
          },

          set(prop, value)
          {
            if (property.readonly)
            {
              throw new Error(
                `Attempt to set value of readonly property ${prop}`);
            }
            this[prop] = value;
          },

          dereference(prop, property)
          {
            // Called immediately after the destructor, if the
            // property has `dereference : true`.
            delete this[prop];
          }
        };
    }

    storage = property.storage;

    // Initialize the property
    storage.init(key, Object.assign({}, property));

    // We always generate an event. If the event name isn't specified,
    // use the default name
    property.event = property.event || `change${propertyFirstUp}`;

    // There are three values that may be used when `resetProperty` is called:
    // - the user-assigned value
    // - a theme's value (if the property is themeable)
    // - an inherited value (if the property is inheritable)
    //
    // Create the legacy names for these values, which are used at
    // various places in and around the qooxdoo framework code.

    // user-specified
    Object.defineProperty(
      clazz.prototype,
      `$$user_${key}`,
      {
        value        : undefined,
        writable     : true,
        configurable : false,
        enumerable   : false
      });

    // theme-specified
    if (property.themeable)
    {
      Object.defineProperty(
        clazz.prototype,
        `$$theme_${key}`,
        {
          value        : undefined,
          writable     : true,
          configurable : false,
          enumerable   : false
        });
    }

    // inheritable
    if (property.inheritable)
    {
      Object.defineProperty(
        clazz.prototype,
        `$$inherit_${key}`,
        {
          value        : undefined,
          writable     : true,
          configurable : false,
          enumerable   : false
        });
    }

    // Create the legacy property getter, getPropertyName
    Object.defineProperty(
      clazz.prototype,
      `get${propertyFirstUp}`,
      {
        value        : function()
        {
          return this[key];
        },
        writable     : false,
        configurable : false,
        enumerable   : false
      });

    // Create the legacy property setter, setPropertyName.
    Object.defineProperty(
      clazz.prototype,
      `set${propertyFirstUp}`,
      {
        value        : function(value)
        {
          this[key] = value;
          return value;
        },
        writable     : false,
        configurable : false,
        enumerable   : false
      });

    if (property.inheritable)
    {
      // Create this property's resetProperty method
      Object.defineProperty(
        clazz.prototype,
        `reset${propertyFirstUp}`,
        {
          value        : function(value)
          {
            // Get the current user-specified value
            let             inheritValue =
                (property.inheritable
                 ? this[`$$inherit_${key}`]
                 : undefined);
            let             initValue =
                (property.initFunction
                 ? property.initFunction.call(this)
                 : ("init" in property
                    ? property.init
                    : undefined));

            // Unset the user value
            this[`$$user_${key}`] = undefined;

            // Select the new value
            this[key] = inheritValue !== undefined ? inheritValue : initValue;
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });

      // Create this property's refreshProperty method
      Object.defineProperty(
        clazz.prototype,
        `refresh${propertyFirstUp}`,
        {
          value        : function()
          {
            let             inheritedValue;
            let             layoutParent;
            let             userValue = this[`$$user_${key}`];

            // If there's a user value, it takes precedence
            if (typeof userValue != "undefined")
            {
              // Use the user value as the property value
              this[key] = userValue;
              return;
            }

            // If there's a layout parent and if it has a property of
            // this name, ...
            layoutParent =
              (typeof this.getLayoutParent == "function"
               ? this.getLayoutParent()
               : undefined);
            if (layoutParent && typeof layoutParent[key] != "undefined")
            {
              // ... then retrieve its value
              inheritedValue = layoutParent[key];

              // If we found a value to inherit...
              if (typeof inheritedValue != "undefined")
              {
                // ... then save the inherited value, ...
                this[`$$inherit_${key}`] = inheritedValue;

                // ... and also use the inherited value as the property value
                this[key] = inheritedValue;
              }
            }
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });
    }

    if (property.themeable)
    {
      // Create this property's setThemedProperty method
      Object.defineProperty(
        clazz.prototype,
        `setThemed${propertyFirstUp}`,
        {
          value        : function(value)
          {
            // Get the current user-specified value
            let             userValue = this[`$$user_${key}`];

            // Save the provided themed value
            this[`$$theme_${key}`] = value;

            // User value has precedence, so if it's not set, use theme value
            if (userValue === undefined)
            {
              this[key] = value;
            }
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });

      // Create this property's resetThemedProperty method
      Object.defineProperty(
        clazz.prototype,
        `resetThemed${propertyFirstUp}`,
        {
          value        : function(value)
          {
            // Get the current user-specified value
            let             userValue = this[`$$user_${key}`];
            let             initValue =
                (property.initFunction
                 ? property.initFunction.call(this)
                 : ("init" in property
                    ? property.init
                    : undefined));

            // Unset the themed value
            this[`$$theme_${key}`] = undefined;

            // Select the new value
            this[key] = userValue !== undefined ? userValue : initValue;
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });
    }

    // If there's an init or initFunction handler, ...
    if (typeof property.init != "undefined" ||
        typeof property.initFunction == "function")
    {
      // ... then create initPropertyName
      Object.defineProperty(
        clazz.prototype,
        `init${propertyFirstUp}`,
        {
          value        : function()
          {
            // Allow storing init value even if readonly
            let             readonly = property.readonly;

            property.readonly = false;

            if (property.initFunction)
            {
              storage.set.call(
                this, key, property.initFunction.call(this, key));
            }
            else if (property.init)
            {
              storage.set.call(this, key, property.init);
            }

            // Reset the original value of readonly
            property.readonly = readonly;
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });
    }

    // If this is a boolean, as indicated by check : "Boolean" ...
    if (typeof property.check == "string" &&
        property.check == "Boolean")
    {
      // ... then create isPropertyName and togglePropertyName
      Object.defineProperty(
        clazz.prototype,
        `is${propertyFirstUp}`,
        {
          value        : function()
          {
            return !! this[key];
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });

      Object.defineProperty(
        clazz.prototype,
        `toggle${propertyFirstUp}`,
        {
          value        : function()
          {
            this[key] = ! this[key];
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });
    }

    if (property.async)
    {
      let             get;
      let             apply;

      // Obtain the required get function
      if (typeof property.get == "function")
      {
        get = property.get;
      }
      else if (typeof property.get == "string")
      {
        get = clazz.prototype[property.get];
      }

      // Obtain the required apply function
      if (typeof property.apply == "function")
      {
        apply = property.apply;
      }
      else if (typeof property.apply == "string")
      {
        apply = clazz.prototype[property.apply];
      }

      // Both get and apply must be provided
      if (typeof get != "function" || typeof apply != "function")
      {
        throw new Error(
          `${key}: ` +
            `async property requires that both 'get' and 'apply' be provided`);
      }

      // Create a place to store the current promise for the async setter
      Object.defineProperty(
        clazz.prototype,
        `$$activePromise${propertyFirstUp}`,
        {
          value        : null,
          writable     : true,
          configurable : false,
          enumerable   : false
        });

      // Create a function that tells the user whether the most recent
      // call to the setter has reolved
      Object.defineProperty(
        clazz.prototype,
        `isAsyncSetActive${propertyFirstUp}`,
        {
          value        : function()
          {
            return this[`$$activePromise${propertyFirstUp}`] === null;
          },
          writable     : true,
          configurable : false,
          enumerable   : false
        });

      // Create the async property getter, getPropertyNameAsync
      Object.defineProperty(
        clazz.prototype,
        `get${propertyFirstUp}Async`,
        {
          value        : async function()
          {
            return get.call(this);
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });

      // Create the async property setter, setPropertyNameAsync.
      Object.defineProperty(
        clazz.prototype,
        `set${propertyFirstUp}Async`,
        {
          value        : async function(value)
          {
            let        activePromise;
            let        activePromiseProp = `$$activePromise${propertyFirstUp}`;

            const           setImpl = async function()
            {
              let      old;

              value = Promise.resolve(value);

              // Obtain the old value, via its async request
              old = await this[`get${propertyFirstUp}Async`]();

              // If the value has changed since last time, do nothing
              if (property.isEqual(value, old))
              {
                // Save the new property value. This is before any async calls
                storage.set.call(this, key, value);

                await apply.call(this, value, old, key);

                // Now that we have the async result, fire the change event
                console.log(
                  `Would generate event type ${property.event} ` +
                    `{ value: ${value}, old: ${old} } (async event)`);
              }

              // If we ar ethe last promise, dispose of the promise
              if (activePromise === this[activePromiseProp])
              {
                this[activePromiseProp] = null;
              }
            }.bind(this);

            // If this property already has an active promise...
            if (this[activePromiseProp])
            {
              // ... then add this request to the promise chain
              activePromise =
                this[activePromiseProp].then(setImpl);
            }
            else
            {
              // There are no pending requests. Begin this one right now.
              activePromise = setImpl();
            }

            this[activePromiseProp] = activePromise;
            return activePromise;
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });
    }

    // Add the event name for this property to the list of events
    // fired by this class
    let eventName = property.event;
    let events =
        {
          [eventName] : "qx.event.type.Data"
        };
    __addEvents(clazz, events, true);

    // Add annotations
    __attachAnno(clazz, "properties", key, property["@"]);
  }

  // Add events. These are used for the API Viewer to show what events
  // are generated by the class, but not otherwise validated in the
  // code. (It would be very difficult to do so.) It is the
  // developer's responsibility to keep the event list for a class up
  // to date with uses of `fireEvent()`, `fireDataEvent(), etc.
  if (config.events)
  {
    __addEvents(clazz, config.events, true);
  }

  //
  // Store destruct onto class. We wrap their function (or an empty
  // function) in code that also handles any properties that
  // require`dereference : true`
  //
  let             destruct = config.destruct || function() {};

  if (qx.core.Environment.get("qx.aspects"))
  {
    destruct = qx.core.Aspect.wrap(className, destruct, "destructor");
  }

  // Wrap the destructor in a function that calls the original
  // destructor and then deletes any property remnants for
  // properties that are marked as `dereference : true`.
  let destructDereferencer = function()
  {
    let             properties = this.constructor.$$allProperties;

    // First call the original or aspect-wrapped destruct method
    destruct.call(this);

    // Now ensure all properties marked with `derefrence : true`
    // have their saved values removed from this object.
    for (let prop in properties)
    {
      let           property = properties[prop];

      // If this property is specified to be dereference upon dispose,
      // or its check indicates that it's a type that requires being
      // dereferenced...
      if (property.dereference ||
          [
            // Perform magic. These types (as indicated by their
            // `check`, need to be dereferenced even if `dereference`
            // isn't specified for the propery. Or rather, in old IE
            // days, they needed to be explicitly removed from the
            // object. They may not need to be any longer, but it
            // doesn't hurt terribly to continue to do so.
            "Node",
            "Element",
            "Document",
            "Window",
            "Event",
          ].includes(property.config))
      {
        // If the storage mechanism has a dereference method, let it
        // do its thing
        property.storage.dereference &&
          property.storage.dereference.call(this, prop, property);

        // Get rid of our internal storage of the various possible
        // values for this property
        delete this[`$$user_${prop}`];
        delete this[`$$theme_${prop}`];
        delete this[`$$inherit_${prop}`];
      }
    }
  };

  clazz.$$destructor = destructDereferencer;
  qx.Bootstrap.setDisplayName(destructDereferencer, className, "destruct");

  // Create the specified namespace
  path = globalThis;
  classnameComponents = className.split(".");
  classnameComponents.forEach(
    (component, i) =>
    {
      const           bExists = component in path;
      const           isLast = i == classnameComponents.length - 1;

      if (! bExists && isLast)
      {
        path[component] = clazz;
      }
      else if (! bExists)
      {
        path[component] = {};
      }
      else if (bExists && ! isLast)
      {
        // Not last component, so is allowed to exist. Just keep traversing.
      }
      else
      {
        throw new Error(
          `Namespace component ${component} from ${className} already exists`);
      }

      path = path[component];
    });

  // Now that the class has been defined, call its (optional) defer function
  if (config.defer)
  {
    // Do not allow modification to the property map at this stage.
    config.defer(clazz, clazz.prototype, Object.assign({}, config.properties));
  }

  return clazz;
}


function _extend(className, config)
{
  const           type = config.type || "class";
  const           superclass = config.extend || Object;
  const           subclass =
        (config.construct ||
         (config.type == "static"
          ? function()
            {
              throw new Error(
                `${className}: can not instantiate a static class`);
            }
          : function()
            {
            }));
  const           properties = config.properties;
  const           customProxyHandler = config.proxyHandler;
  let             allProperties = superclass.$$allProperties || {};
  let             initFunctions = [];

  // Ensure there are no properties defined that overwrite
  // superclasses' properties, unless "refine : true" is specified.
  // For now, we allow a property to be entirely overwritten if refine: true
  // is specified.
  for (let property in properties)
  {
    if (property in allProperties && ! properties[property].refine)
    {
      throw new Error(
        `Overwriting property "${property}" without "refine: true"`);
    }

    // Does this property have an initFunction?
    if (properties[property].initFunction)
    {
      // Yup. Keep track of it.
      initFunctions.push(property);
    }
  }

  // Allow easily identifying this class
  qx.Bootstrap.setDisplayName(subclass, className);

  // Provide access to the superclass for base calls
  subclass.base = superclass;

  // Some internals require that `superclass` be defined too
  subclass.superclass = superclass;

  // Create the subclass' prototype as a copy of the superclass' prototype
  subclass.prototype = Object.create(superclass.prototype);
  subclass.prototype.base = base;
  subclass.prototype.constructor = subclass;

  // Save this object's properties
  Object.defineProperty(
    subclass,
    "$$properties",
    {
      value        : properties || {},
      writable     : false,
      configurable : false,
      enumerable   : false
    });

  // Save the full chain of properties for this class
  allProperties = Object.assign({}, allProperties, properties || {});
  Object.defineProperty(
    subclass,
    "$$allProperties",
    {
      value        : allProperties,
      writable     : false,
      configurable : false,
      enumerable   : false
    });

  // Save any init functions that need to be called upon instantiation
  Object.defineProperty(
    subclass,
    "$$initFunctions",
    {
      value        : initFunctions,
      writable     : false,
      configurable : false,
      enumerable   : false
    });

  // Proxy the subclass so we can watch for property changes
  subclass.prototype.constructor = new Proxy(
    subclass,
    {
      construct : function(target, args)
      {
        let             proxy;
        let             handler;
        let             obj = Object.create(subclass.prototype);

        // add abstract and singleton checks
        if (type === "abstract")
        {
          if (target.classname === className)
          {
            throw new Error(
              "The class '," +
                className +
                "' is abstract! It is not possible to instantiate it."
            );
          }
        }

        if (type === "singleton")
        {
          if (! target.$$allowconstruct)
          {
            throw new Error(
              "The class '" +
                className +
                "' is a singleton! It is not possible to instantiate it " +
                "directly. Use the static getInstance() method instead."
            );
          }
        }

        handler =
          {
            get : function(obj, prop)
            {
              let             property = subclass.$$allProperties[prop];
              const           storage =
                property && property.storage
                    ? property.storage
                    : {
                        // get non-properties from standard storage
                        get(prop)
                        {
                          return this[prop];
                        }
                      };

              // If there's a custom proxy handler, try it
              if (customProxyHandler && customProxyHandler.get)
              {
                let value = customProxyHandler.get(obj, prop);
                if (typeof value != "undefined")
                {
                  return value;
                }
              }

              return storage.get.call(obj, prop);
            },

            set : function(obj, prop, value)
            {
              let             origValue = value;
              let             old = Reflect.get(obj, prop);
              let             property = subclass.$$allProperties[prop];
              const           storage =
                property && property.storage
                    ? property.storage
                    : {
                        // set non-properties to standard storage
                        set(prop, value)
                        {
                          this[prop] = value;
                        }
                      };

              // Is this a property?
              if (property)
              {
                // Ensure they're not setting null to a non-nullable property
                if (! property.nullable && value === null)
                {
                  throw new Error(
                    `${className}: ` +
                      `attempt to set non-nullable property ${prop} to null`);
                }

                // Yup. Does it have a transform method?
                if (property.transform)
                {
                  // It does. Call it. It returns the new value.
                  if (typeof property.transform == "function")
                  {
                    value = property.transform.call(obj, value, old);
                  }
                  else // otherwise it's a string
                  {
                    value = obj[property.transform].call(obj, value, old);
                  }
                }

                // Does it have a check to be done? If nullable and
                // the value is null, we don't run the check
                if (property.check)
                {
                  // If the property is nullable and the value is null...
                  if (property.nullable && value === null)
                  {
                    // ... then we don't do the check
                  }
                  else if ($$checks.has(property.check))
                  {
                    if (! $$checks.get(property.check)(value))
                    {
                      throw new Error(
                        `${prop}: ` +
                          `Expected value to be of type ${property.check}; ` +
                          `value=${value}`);
                    }
                  }
                  else if (typeof property.check == "function" &&
                           ! property.check(value))
                  {
                    throw new Error(
                      `${prop}: ` +
                        `Check function indicates wrong type value; ` +
                        `value=${value}`);
                  }
                  else if (typeof property.check == "string")
                  {
                    // First try to parse the check string as JSDoc
                    let             bJSDocParsed = false;
                    try
                    {
                      const           { parse } = require("jsdoctypeparser");
                      const           ast = parse(property.check);

                      // Temporarily, while we don't yet support
                      // checks based on the jsdoc AST, flag whether
                      // we successfully parsed the type. If so, we'll
                      // stop the check when the error is thrown by
                      // __checkValueAgainstJSdocAST(); If not, we
                      // want to fall through to additional checks.
                      bJSDocParsed = true;
                      __checkValueAgainstJSdocAST(
                        prop, value, ast, property.check);
                    }
                    catch(e)
                    {
                      // If we successfully parsed, rethrow the check error
                      if (bJSDocParsed)
                      {
                        throw e;
                      }

                      // Couldn't parse JSDoc so the check string is
                      // not a JSDoc one. Fall through to next
                      // possible use of the check string.
                      //
                      // FALL THROUGH
                    }

                    // JSDoc parsing failed, so try executing the
                    // string as a function
                    let             fCheck;
                    try
                    {
                      fCheck = new Function(
                        "value", `return (${property.check});`);
                    }
                    catch(e)
                    {
                      throw new Error(
                        `${prop}: ` +
                          `Error running check: ${property.check}`, e);
                    }

                    if (! fCheck(value))
                    {
                      throw new Error(
                        `${prop}: ` +
                          `Check code indicates wrong type value; ` +
                          `value=${value}`);
                    }
                  }
                  else
                  {
                    throw new Error(`${prop}: Unrecognized check type`);
                  }
                }

                // Does it have a validation function?
                if (property.validate)
                {
                  // It does. Call it. It throws an error on validation failure
                  if (typeof property.validate == "function")
                  {
                    property.validate.call(obj, value);
                  }
                  else // otherwise it's a string
                  {
                    obj[property.validate].call(obj, value);
                  }
                }

                // Does it a synchronous method with an apply method?
                // (Async properties' apply method is called directly from
                // setPropertyNameAsync() )
                if (property.apply &&
                    ! property.async &&
                    ! property.isEqual(value, old))
                {
                  // It does. Call it.
                  if (typeof property.apply == "function")
                  {
                    property.apply.call(obj, value, old, prop);
                  }
                  else // otherwise it's a string
                  {
                    obj[property.apply].call(obj, value, old, prop);
                  }
                }

                // Are we requested to generate an event?
                if (property.event &&
                    ! property.async &&
                    ! property.isEqual(value, old))
                {
                  console.log(
                    `Would generate event type ${property.event} ` +
                      `{ value: ${value}, old: ${old} }`);
                }

                // Set the (possibly updated) value
                if (property.readonly)
                {
                  throw new Error(
                    `Attempt to set value of readonly property ${prop}`);
                }

                // Save the value
                storage.set.call(obj, prop, value);

                // Also specify that this was a user-specified value
                this[`$$user_${prop}`] = value;

                return true;
              }

              // If there's a custom proxy handler, call it
              if (customProxyHandler && customProxyHandler.set)
              {
                customProxyHandler.set(obj, prop, value);
                return true;
              }

              storage.set.call(obj, prop, value);
              return true;
            }
          };

        proxy = new Proxy(obj, handler);

        // Call any initFunctions defined for properties of this class
        target.$$initFunctions.forEach(
          (prop) =>
          {
            let       propertyFirstUp = prop[0].toUpperCase() + prop.substr(1);

            // Initialize this property
            obj[`init${propertyFirstUp}`]();
          });

        this.apply(target, proxy, args);

        return proxy;
      },
      
      apply : function(target, _this, args)
      {
        // Call the constructor
        subclass.apply(_this, args);
      }
    });

  return subclass.prototype.constructor;
}

function base(args, varargs)
{
  if (typeof args.callee.base != "function")
  {
    throw new Error(
      "Cannot call super class. Method is not derived: " +
        qx.Bootstrap.getDisplayName(args.callee));
  }

  if (arguments.length === 1)
  {
    return args.callee.base.call(this);
  }
  else
  {
    return args.callee.base.apply(
      this,
      Array.prototype.slice.call(arguments, 1)
    );
  }
}

/**
 * Helper method to handle singletons
 *
 * @internal
 * @return {Object} The singleton instance
 */
function getInstance()
{
  if (this.$$instance === null)
  {
    throw new Error(
      "Singleton instance of " +
        this +
        " is requested, but not ready yet. This is most likely due" +
        " to a recursive call in the constructor path."
    );
  }

  if (!this.$$instance)
  {
    // Allow calling the constructor
    this.$$allowconstruct = true;

     // null means "object is being created"; needed for another call
     // of getInstance() during instantiation
    this.$$instance = null;

    // Obtain the singleton instance
    this.$$instance = new this();

    // Disallow, again, calling the constructor
    delete this.$$allowconstruct;
  }

  return this.$$instance;
}

/**
 * Get the internal class of the value. See
 * http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
 * for details.
 *
 * @param value {var} value to get the class for
 * @return {String} the internal class of the value
 */
function getClass(value)
{
  // The typeof null and undefined is "object" under IE8
  if (value === undefined)
  {
    return "Undefined";
  }
  else if (value === null)
  {
    return "Null";
  }

  let classString = Object.prototype.toString.call(value);
  return (
    qx.Bootstrap.__classToTypeMap[classString] || classString.slice(8, -1)
  );
}

/**
 * Whether the value is a string.
 *
 * @param value {var} Value to check.
 * @return {Boolean} Whether the value is a string.
 */
function isString(value) {
  // Added "value !== null" because IE throws an exception "Object expected"
  // by executing "value instanceof String" if value is a DOM element that
  // doesn't exist. It seems that there is an internal difference between a
  // JavaScript null and a null returned from calling DOM.
  // e.q. by document.getElementById("ReturnedNull").
  return (
    value !== null &&
    (typeof value === "string" ||
      qx.Bootstrap.getClass(value) === "String" ||
      value instanceof String ||
      (!!value && !!value.$$isString))
  );
}

/**
 * Whether the value is an array.
 *
 * @param value {var} Value to check.
 * @return {Boolean} Whether the value is an array.
 */
function isArray(value)
{
  // Added "value !== null" because IE throws an exception "Object expected"
  // by executing "value instanceof Array" if value is a DOM element that
  // doesn't exist. It seems that there is an internal difference between a
  // JavaScript null and a null returned from calling DOM.
  // e.q. by document.getElementById("ReturnedNull").
  return (
    value !== null &&
    (value instanceof Array ||
      (value &&
        qx.data &&
        qx.data.IListData &&
        qx.util.OOUtil.hasInterface(
          value.constructor,
          qx.data.IListData
        )) ||
      qx.Bootstrap.getClass(value) === "Array" ||
      (!!value && !!value.$$isArray))
  );
}

/**
 * Whether the value is an object. Note that built-in types like Window are
 * not reported to be objects.
 *
 * @param value {var} Value to check.
 * @return {Boolean} Whether the value is an object.
 */
function isObject(value)
{
  return (
    value !== undefined &&
    value !== null &&
    qx.Bootstrap.getClass(value) === "Object"
  );
}

/**
 * Whether the value is a function.
 *
 * @param value {var} Value to check.
 * @return {Boolean} Whether the value is a function.
 */
function isFunction(value)
{
  return qx.Bootstrap.getClass(value) === "Function";
}

/**
 * Whether the value is a function or an async function.
 *
 * @param value {var} Value to check.
 * @return {Boolean} Whether the value is a function.
 */
function isFunctionOrAsyncFunction(value)
{
  var name = qx.Bootstrap.getClass(value);
  return name === "Function" || name === "AsyncFunction";
}

/**
 * Attach events to the class
 *
 * @param clazz {Class} class to add the events to
 * @param events {Map} map of event names the class fires.
 * @param patch {Boolean ? false} Enable redefinition of event type?
 */
function __addEvents(clazz, events, patch) {
  let             key;

  if (qx.core.Environment.get("qx.debug"))
  {
    if (typeof events !== "object" ||
        qx.Bootstrap.getClass(events) === "Array")
    {
      throw new Error(
        clazz.classname + ": the events must be defined as map!");
    }

    for (key in events)
    {
      if (typeof events[key] !== "string")
      {
        throw new Error(
          clazz.classname +
            "/" +
            key +
            ": the event value needs to be a string with the class name " +
            "of the event object which will be fired.");
      }
    }

    // Compare old and new event type/value if patching is disabled
    if (clazz.$$events && patch !== true)
    {
      for (key in events)
      {
        if (clazz.$$events[key] !== undefined &&
            clazz.$$events[key] !== events[key])
        {
          throw new Error(
            clazz.classname +
              "/" +
              key +
              ": the event value/type cannot be changed from " +
              clazz.$$events[key] +
              " to " +
              events[key]);
        }
      }
    }
  }

  if (clazz.$$events)
  {
    for (key in events)
    {
      clazz.$$events[key] = events[key];
    }
  }
  else
  {
    clazz.$$events = events;
  }
}

/**
 * Attaches an annotation to a class
 *
 * @param clazz {Map} Static methods or fields
 * @param group {String} Group name
 * @param key {String} Name of the annotated item
 * @param anno {Object} Annotation object
 */
function __attachAnno(clazz, group, key, anno) {
  // If there's no annotation, we have nothing to do
  if (anno === undefined)
  {
    return;
  }

  if (clazz.$$annotations === undefined)
  {
    clazz.$$annotations = {};
    clazz.$$annotations[group] = {};
  }
  else if (clazz.$$annotations[group] === undefined)
  {
    clazz.$$annotations[group] = {};
  }

  if (! Array.isArray(anno))
  {
    anno = [anno];
  }

  if (key)
  {
    clazz.$$annotations[group][key] = anno;
  }
  else
  {
    clazz.$$annotations[group] = anno;
  }
}

function __validatePropertyDefinitions(className, config)
{
  let             allowedKeys;
  let             properties = config.properties || {};

  for (let prop in properties)
  {
    let             property = properties[prop];

    // Set allowed keys based on whether this is a grouped property or not
    allowedKeys = property.group ? $$allowedPropGroupKeys : $$allowedPropKeys;

    // Ensure only allowed keys were provided
    Object.keys(property).forEach(
      (key) =>
      {
        let             allowed = allowedKeys[key];

        if (! (key in allowedKeys))
        {
          throw new Error(
            `${className}: ` +
              (property.group ? "group " : "") +
              `property '${prop}' defined with unrecognized key '${key}'`);
        }

        // Flag any deprecated keys
        if (key in $$deprecatedPropKeys)
        {
          console.warn(`Property '${prop}': ${$$deprecatedPropKeys[key]}`);
        }

        if (allowed !== null)
        {
          // Convert non-array 'allowed' values to an array
          if (! Array.isArray(allowed))
          {
            allowed = [ allowed ];
          }

          if (! allowed.includes(typeof property[key]))
          {
            throw new Error(
              `${className}: ` +
                (property.group ? "group " : "") +
                `property '${prop}' defined with wrong value type ` +
                `for key '${key}'`);
          }
        }
      });
  }
}

function __checkValueAgainstJSdocAST(prop, value, ast, check)
{
  console.log(
    `JSDoc AST of ${check}:\n` + JSON.stringify(ast, null, "  "));

  // TODO: implement this
  throw new Error(
    `${prop}: ` +
      `JSDoc type checking is not yet implemented`);
}



//
// Extras
//

function assert(message, assertionSuccess)
{
  console.log(
    (assertionSuccess ? "OK  " : "FAIL") +
      " " +
      message);
}

module.exports = { qx, assert };
