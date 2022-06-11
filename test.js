//
// Test program here. qx.Class and qx.Property implementations, below
//

let qx =
    {
      Class :
      {
        define : define
      }
    };

qx.Class.define(
  "tester.Superclass",
  {
    extend : Object,
    construct : function()
    {
      console.log("Test constructor");
    },

    properties :
    {
      running :
      {
        init : true,
        check : "Boolean",
        event : "_changeRunning",
        apply : "_applyRunning",
        transform : function(value, old)
        {
          console.log(
            `transform running: value changing from ${old} to ${value}`);

//          return value ? 23 : 42;
          return value;
        }
      }
    },

    members :
    {
      num : 23,
      str : "hello world",

      _applyRunning : function(value, old)
      {
        console.log(`apply running: value changing from ${old} to ${value}`);
      }
    }
  });

let superinstance = new tester.Superclass();
console.log("superinstance=", superinstance);
console.log("num=" + superinstance.num);
console.log("str=" + superinstance.str);
console.log("running initial value=", superinstance.running);
superinstance.running = false;
console.log("running after assigning false=", superinstance.running);
superinstance.setRunning(true);
console.log("running after assigning true first=", superinstance.running);
console.log("getRunning returned ", superinstance.getRunning());
superinstance.running = true;
console.log("running after assigning true second=", superinstance.running);
console.log("");
superinstance.toggleRunning();
console.log("running after toggle=", superinstance.running);
console.log("running via isRunning()=", superinstance.isRunning());

console.log("");
console.log("defining tester.Subclass");

qx.Class.define(
  "tester.Subclass",
  {
    extend : tester.Superclass,

    properties :
    {
      running :
      {
        refine : true,
        init : 42,
        check : "Number",
      }
    }
  });

let subinstance = new tester.Subclass();
console.log("");
console.log("sub num=" + subinstance.num);
console.log("sub str=" + subinstance.str);
console.log("sub instance.getRunning()=", subinstance.getRunning());
subinstance.running = false;
console.log("sub after setting to false, instance.getRunning()=", subinstance.getRunning());


//
// qx.Class and qx.Property implementation
//


function _extend(superclass, subclass, properties)
{
  let             allProperties = superclass.$allProperties || {};

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

  // Create the subclass' prototype as a copy of the superclass' prototype
  subclass.prototype = Object.create(superclass.prototype);

  // Save this class' properties
  Object.defineProperty(
    subclass,
    "$properties",
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
    "$allProperties",
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
        const           obj = Object.create(subclass.prototype);

        this.apply(target, obj, args);

        handler =
          {
            get : function(obj, prop)
            {
              return obj[prop];
            },

            set : function(obj, prop, value)
            {
              let             origValue = value;
              let             old = Reflect.get(obj, prop);
              let             properties = subclass.$properties[prop];

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
              }

              // Set the (possibly updated) value
              obj[prop] = value;
              return true;
            }
          };

        proxy = new Proxy(obj, handler);
        Object.defineProperty(
          proxy,
          "$handler",
          {
            value        : handler,
            writable     : false,
            configurable : false,
            enumerable   : false
          });

        return proxy;
      },
      
      apply : function(target, _this, args)
      {
        superclass.apply(_this, args);
        subclass.apply(_this, args);
      }
    });

  return subclass.prototype.constructor;
}

function define(className, config)
{
  let             clazz;
  let             proxy;
  let             handler;
  let             path;
  let             classnameComponents;

  clazz = _extend(
    config.extend || Object,
    config.construct || function() {},
    config.properties);

  for (let member in config.members)
  {
    Object.defineProperty(
      clazz.prototype,
      member,
      {
        value        : config.members[member],
        writable     : true,
        configurable : true,
        enumerable   : true
      });
  }

  for (let property in config.properties)
  {
    let             propertyFirstUp;

    // Create the property variable
    Object.defineProperty(
      clazz.prototype,
      property,
      {
        value        : config.properties[property].init,
        writable     : ("readonly" in config.properties[property]
                        ? config.members[property].readonly
                        : true),
        configurable : false,
        enumerable   : false
      });

    // Capitalize the property name
    propertyFirstUp = property[0].toUpperCase() + property.substr(1);

    // Create the legacy property getter, getPropertyName
    Object.defineProperty(
      clazz.prototype,
      `get${propertyFirstUp}`,
      {
        value        : function()
        {
          return this[property];
        },
        writable     : false,
        configurable : false,
        enumerable   : false
      });

    // Unless told not to, create the legacy methods
    if (! config.properties[property].noLegacyMethods)
    {
      // Create the legacy property setter, setPropertyName
      Object.defineProperty(
        clazz.prototype,
        `set${propertyFirstUp}`,
        {
          value        : function(value)
          {
            this[property] = value;
          },
          writable     : false,
          configurable : false,
          enumerable   : false
        });

      // If this is a boolean, as indicated by check : "Boolean" ...
      if (typeof config.properties[property].check == "string" &&
          config.properties[property].check == "Boolean")
      {
        // ... then create isPropertyName and togglePropertyName
        Object.defineProperty(
          clazz.prototype,
          `is${propertyFirstUp}`,
          {
            value        : function()
            {
              return !! this[property];
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
              this[property] = ! this[property];
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
        console.log("Created path ", path);
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

