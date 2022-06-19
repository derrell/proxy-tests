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
      }
    };

/**
 * Supported keys for property definitions
 *
 * @internal
 */
let stringOrFunction = [ "string", "function" ];
let $$allowedKeys =
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
let $$allowedGroupKeys =
    {
      "@": null,                  // Anything
      name: "string",             // String
      group: "object",            // Array
      mode: "string",             // String
      themeable: "boolean"        // Boolean
    };

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

    if (! property.storage)
    {
      // Create the default storage mechanism for properties, used when
      // the property doesn't provide its own storage functions.
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

    if (property.async && property.get)
    {
      let             get;

      // It does. Call it.
      if (typeof property.get == "function")
      {
        get = property.get;
      }
      else // otherwise it's a string
      {
        get = clazz.prototype[property.get];
      }

      // Create the async property getter, getPropertyNameAsync
      Object.defineProperty(
        clazz.prototype,
        `get${propertyFirstUp}Async`,
        {
          value        : function()
          {
            return get.call(this);
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });
    }

    if (property.async && property.apply)
    {
      let             apply;

      // It does. Call it.
      if (typeof property.apply == "function")
      {
        apply = property.apply;
      }
      else // otherwise it's a string
      {
        apply = clazz.prototype[property.apply];
      }
      
      // Create the async property setter, setPropertyNameAsync.
      Object.defineProperty(
        clazz.prototype,
        `set${propertyFirstUp}Async`,
        {
          value        : function(value)
          {
            let             old = this[key];
            
            this[key] = value;
            return apply.call(this, value, old);
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });
    }

    // Add the event name for this property to the list of events
    // fired by this class
    let eventName = `change${propertyFirstUp}`;
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

      if (property.dereference)
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

                // Does it have a check to be done?
                if (property.check)
                {
                  console.log(
                    `Would be checking ${value} against ${property.check}`);
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
                if (property.apply && ! property.async)
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
                if (property.event && value != old)
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
    allowedKeys = property.group ? $$allowedGroupKeys : $$allowedKeys;

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
