//
// Test program is here at the top.
// qx.Class.define and and property implementations are below
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

    construct : function(bRunning)
    {
      console.log(`Superclass constructor: bRunning=${bRunning}`);
      this.running = bRunning;
    },

    properties :
    {
      running :
      {
        init : true,
        check : "Boolean",
        event : "changeRunning",
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

      publicMethod : function()
      {
        console.log("superclass publicMethod called");
      },

      _applyRunning : function(value, old)
      {
        console.log(
          `superclass apply running: value changing from ${old} to ${value}`);
      }
    }
  });

qx.Class.define(
  "tester.Subclass",
  {
    extend : tester.Superclass,

    construct : function(num, bRunning)
    {
      console.log(`Subclass constructor: num=${num} bRunning=${bRunning}`);
      this.base(bRunning); // super();
      this.publicMethod();
    },

    members :
    {
      publicMethod : function()
      {
        console.log("subclass publicMethod called");
        this.base.prototype.publicMethod.call(this); // super();
      },

      _applyRunning : function(value, old)
      {
        console.log(
          `subclass apply running: value changing from ${old} to ${value}`);
        this.base.prototype._applyRunning.call(this, value, old); // super();
      }
    },

    properties :
    {
      // running :
      // {
      //   refine : true,
      //   init : 42,
      //   check : "Number",
      //   apply : "_applyRunning"
      // }
    }
  });

qx.Class.define(
  "tester.Arr",
  {
    extend : Array,

    // Show how qx.data.Array could be indexed rather than getItem()
    proxyHandler :
    {
      get : function(target, prop)
      {
        console.log("Arr proxyHandler.get: prop=", prop);
        return target.getItem(prop);
      },

      set : function(target, prop, value)
      {
        console.log("Arr proxyHandler.set");
        target.setItem(prop, value);
      }
    },

    properties :
    {
      arr :
      {
        initIfUndefined : () =>
        {
          console.log("Allocating a new array object");
          return [];
        }
      }
    },

    members :
    {
      getItem(i)
      {
        return "Item " + i + " is 42";
      },

      setItem(i, value)
      {
        console.log(`setItem ${i} to ${value}`);
      }
    }
  });


// Instantiate our superclass object and check member variable access
let superinstance = new tester.Superclass(false);
console.log("superinstance=", superinstance);
console.log("num=" + superinstance.num);
console.log("str=" + superinstance.str);

// get and set property using new, getter/setter syntax
console.log("running initial value=", superinstance.running);
superinstance.running = false;
console.log("running after assigning false=", superinstance.running);

// set property using traditional function syntax
superinstance.setRunning(true);
console.log("running after assigning true first=", superinstance.running);
console.log("getRunning returned ", superinstance.getRunning());

// back to getter/setter syntax. The two syntaxes are interchangeable
superinstance.running = true;
console.log("running after assigning true second=", superinstance.running);

// test check: "Boolean"'s togglePropertyName and isPropertyName functions
console.log("");
superinstance.toggleRunning();
console.log("running after toggle=", superinstance.running);
console.log("running via isRunning()=", superinstance.isRunning());

// create a subclass to test inherited members and properties
console.log("");
console.log("defining tester.Subclass");

let subinstance = new tester.Subclass(23, true);
console.log("");
console.log("sub num=" + subinstance.num);
console.log("sub str=" + subinstance.str);
console.log("sub instance.getRunning()=", subinstance.getRunning());
subinstance.running = true;
subinstance.running = false;
console.log("sub after setting to false, instance.getRunning()=",
            subinstance.getRunning());

let arr = new tester.Arr();
console.log("arr[2]=", arr[2]);
arr[3] = 23;
console.log("arr.getArr()=", arr.getArr());

//
// qx.Class and qx.Property implementation
//


function _extend(superclass, subclass, properties, customProxyHandler)
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

  // Create the subclass' prototype as a copy of the superclass' prototype
  subclass.prototype = Object.create(superclass.prototype);
  subclass.prototype.base = superclass;
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

        this.apply(target, obj, args);

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
                console.log("trying customProxyHandler.get...");
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
        // superclass.apply(_this, args); // auto-run superclass constructor
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
    config.properties,
    config.proxyHandler);

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

