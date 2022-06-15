let qx =
    {
      Bootstrap :
      {
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
        },

        getDisplayName(f)
        {
          return f.$$displayName || "<non-qooxdoo>";
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
          $$environment : {},

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

function define(className, config)
{
  let             clazz;
  let             proxy;
  let             handler;
  let             path;
  let             classnameComponents;

  clazz = _extend(className, config);

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
      return `[Class ${this.classname}]`;
    };
  }

  // Add statics
  for (let key in (config.statics || []))
  {
    Object.defineProperty(
      clazz,
      key,
      {
        value        : config.statics[key],
        writable     : true,
        configurable : true,
        enumerable   : true
      });
  }

  // Add members
  for (let key in (config.members || []))
  {
    let             member = config.members[key];

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

    Object.defineProperty(
      clazz.prototype,
      key,
      {
        value        : member,
        writable     : true,
        configurable : true,
        enumerable   : true
      });
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
    let             propertyFirstUp= key[0].toUpperCase() + key.substr(1);
    const           storage =
      properties.storage
        ? properties.storage
        : {
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
            }
          };

    // If using the default storage mechanism, create the property.
    //
    // If using own storage mechanism, it is required to either
    // initialize the value in the storage mechanism, or call
    // `initPropertyName()` from the constructor to set the initial
    // value.
    if (! properties.storage)
    {
      Object.defineProperty(
        clazz.prototype,
        key,
        {
          value        : property.init,
          writable     : "readonly" in property ? property.readonly : true,
          configurable : false,
          enumerable   : false
        });
    }

    // Unless told not to, create the legacy methods
    if (! property.noLegacyMethods)
    {
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
              if (property.initFunction)
              {
                storage.set.call(this, key, property.initFunction());
              }
              else if (property.init)
              {
                storage.set.call(this, key, property.init);
              }
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
  }

  // Store destruct onto class
  if (config.destruct)
  {
    let             destruct;

    if (qx.core.Environment.get("qx.aspects"))
    {
      destruct = qx.core.Aspect.wrap(className, destruct, "destructor");
    }

    clazz.$$destructor = destruct;
    qx.Bootstrap.setDisplayName(destruct, className, "destruct");
  }

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
  const           subclass = config.construct || function() {};
  const           properties = config.properties;
  const           customProxyHandler = config.proxyHandler;
  let             allProperties = superclass.$$properties || {};

  // Ensure there are no properties defined that overwrite superclasses'
  // properties, unless "refine : true" is specified
  //
  // For now, we allow a property to be entirely overwritten if refine: true
  // is specified
  for (let property in properties)
  {
    if (property in allProperties && ! properties[property].refine)
    {
      throw new Error(
        `Overwriting property "${property}" without "refine: true"`);
    }
  }

  // Allow easily identifying this class
  qx.Bootstrap.setDisplayName(subclass, className);

  // Provide access to the superclass for base calls
  subclass.base = superclass;

  // Create the subclass' prototype as a copy of the superclass' prototype
  subclass.prototype = Object.create(superclass.prototype);
  subclass.prototype.base = base;
  subclass.prototype.constructor = subclass;

  // Save the full chain of properties for this class
  allProperties = Object.assign({}, allProperties, properties || {});
  Object.defineProperty(
    subclass,
    "$$properties",
    {
      value        : allProperties,
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
              let             property = subclass.$$properties[prop];
              const           storage =
                property && property.storage
                    ? property.storage
                    : {
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
              let             property = subclass.$$properties[prop];
              const           storage =
                property && property.storage
                    ? property.storage
                    : {
                        set(prop, value)
                        {
                          this[prop] = value;
                        }
                      };

              // Is this a property?
              if (property)
              {
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
                storage.set.call(obj, prop, value);
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

        this.apply(target, proxy, args);

        return proxy;
      },
      
      apply : function(target, _this, args)
      {
        // superclass.apply(_this, args); // auto-run superclass constructor
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

function assert(message, assertionSuccess)
{
  console.log(
    (assertionSuccess ? "OK  " : "FAIL") +
      " " +
      message);
}

module.exports = { qx, assert };
