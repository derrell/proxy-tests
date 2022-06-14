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
    let             member = config.members[key];

    // Allow easily identifying this method
    member.displayName = `${className}.${key}()`;

    // Allow base calls
    if (typeof member == "function" &&
        key in clazz.prototype)
    {
      member.base = clazz.prototype[key];
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

  // Add properties
  for (let key in (config.properties || []))
  {
    let             property = config.properties[key];
    let             propertyFirstUp= key[0].toUpperCase() + key.substr(1);

    // Create the property variable
    Object.defineProperty(
      clazz.prototype,
      key,
      {
        value        : property.init,
        writable     : "readonly" in property ? property.readonly : true,
        configurable : false,
        enumerable   : false
      });

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
                this[key] = property.initFunction();
              }
              else if (property.init)
              {
                this[key] = property.init;
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
              let             property = subclass.$properties[prop];

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
              let             property = subclass.$properties[prop];

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
                    property.apply.call(obj, value, old);
                  }
                  else // otherwise it's a string
                  {
                    obj[property.apply].call(obj, value, old);
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
                obj[prop] = value;
                return true;
              }

              // If there's a custom proxy handler, call it
              if (customProxyHandler && customProxyHandler.set)
              {
                customProxyHandler.set(obj, prop, value);
                return true;
              }

              obj[prop] = value;
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
