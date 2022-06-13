function define(className, config)
{
  let             clazz;
  let             proxy;
  let             handler;
  let             path;
  let             classnameComponents;

  clazz = _extend(
    className,
    config.extend || Object,
    config.construct || function() {},
    config.properties,
    config.proxyHandler);

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
    // Allow easily identifying this method
    config.members[key].displayName = `${className}.${key}()`;

    // Allow base calls
    if (typeof config.members[key] == "function" &&
        key in clazz.prototype)
    {
      config.members[key].base = clazz.prototype[key];
    }

    Object.defineProperty(
      clazz.prototype,
      key,
      {
        value        : config.members[key],
        writable     : true,
        configurable : true,
        enumerable   : true
      });
  }

  // Add properties
  for (let key in (config.properties || []))
  {
    let             propertyFirstUp;

    // Create the property variable
    Object.defineProperty(
      clazz.prototype,
      key,
      {
        value        : config.properties[key].init,
        writable     : ("readonly" in config.properties[key]
                        ? config.members[key].readonly
                        : true),
        configurable : false,
        enumerable   : false
      });

    // Capitalize the property name
    propertyFirstUp = key[0].toUpperCase() + key.substr(1);

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

    // Unless told not to, create the legacy methods
    if (! config.properties[key].noLegacyMethods)
    {
      // Create the legacy property setter, setPropertyName
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
      if (typeof config.properties[key].init != "undefined" ||
          typeof config.properties[key].initFunction == "function")
      {
        // ... then create initPropertyName
        Object.defineProperty(
          clazz.prototype,
          `init${propertyFirstUp}`,
          {
            value        : function()
            {
              if (config.properties[key].initFunction)
              {
                this[key] = config.properties[key].initFunction();
              }
              else if (config.properties[key].init)
              {
                this[key] = config.properties[key].init;
              }
            },
            writable     : false,
            configurable : false,
            enumerable   : false
          });
      }

      // If this is a boolean, as indicated by check : "Boolean" ...
      if (typeof config.properties[key].check == "string" &&
          config.properties[key].check == "Boolean")
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

  return clazz;
}


function _extend(
  className,
  superclass,
  subclass,
  properties,
  customProxyHandler)
{
  let             allProperties = superclass.$properties || {};

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
  subclass.displayName = className + "()";

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
    "$properties",
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

        handler =
          {
            get : function(obj, prop)
            {
              let             properties = subclass.$properties[prop];

              // If there's not yet a value created, create one if requested
              if (typeof obj[prop] == "undefined" &&
                  properties &&
                  properties.initIfUndefined)
              {
                obj[prop] = properties.initIfUndefined();
                return obj[prop];
              }

              // If there's a custom proxy handler, try it
              if (customProxyHandler && customProxyHandler.get)
              {
                let value = customProxyHandler.get(obj, prop);
                if (typeof value != "undefined")
                {
                  obj[prop] = value;
                }
              }

              return obj[prop];
            },

            set : function(obj, prop, value)
            {
              let             origValue = value;
              let             old = Reflect.get(obj, prop);
              let             properties = subclass.$properties[prop];

              // If there's not yet a value created, create one if requested
              if (typeof obj[prop] == "undefined" &&
                  properties &&
                  properties.initIfUndefined)
              {
                obj[prop] = properties.initIfUndefined();
              }

              // Is this a property?
              if (properties)
              {
                // Yup. Does it have a transform method?
                if (properties.transform)
                {
                  // It does. Call it. It returns the new value.
                  if (typeof properties.transform == "function")
                  {
                    value = properties.transform.call(obj, value, old);
                  }
                  else // otherwise it's a string
                  {
                    value = obj[properties.transform].call(obj, value, old);
                  }
                }

                // Does it have a check to be done?
                if (properties.check)
                {
                  console.log(
                    `Would be checking ${value} against ${properties.check}`);
                }

                // Does it have an apply method?
                if (properties.apply)
                {
                  // It does. Call it.
                  if (typeof properties.apply == "function")
                  {
                    properties.apply.call(obj, value, old);
                  }
                  else // otherwise it's a string
                  {
                    obj[properties.apply].call(obj, value, old);
                  }
                }

                // Are we requested to generate an event?
                if (properties.event && value != old)
                {
                  console.log(
                    `Would generate event type ${properties.event} ` +
                      `{ value: ${value}, old: ${old} }`);
                }

                // Set the (possibly updated) value
                obj[prop] = value;
                return true;
              }

              // If there's a custom proxy handler, call it
              if (customProxyHandler && customProxyHandler.set)
              {
                customProxyHandler.set(obj, prop, value);
                return true;
              }

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
        args.callee.displayName);
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

function assert(message, assertionSuccess)
{
  console.log(
    (assertionSuccess ? "OK  " : "FAIL") +
      " " +
      message);
}

module.exports = { define, assert };
