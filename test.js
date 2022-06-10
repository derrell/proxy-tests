let config =
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

        event : "_changeRunning",

        apply : "_applyRunning",

        transform : function(value, old)
        {
          console.log(
            `transform running: value changing from ${old} to ${value}`);

          return value ? 23 : 42;
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
  };

function extend(superclass, subclass, properties)
{
  // subclass.prototype = Object.create(superclass.prototype);
  // subclass.prototype.constructor = subclass;
  // subclass.base = superclass.prototype;

  // return subclass;

  subclass.prototype = Object.create(superclass.prototype);
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
            $properties : properties,

            get : function(obj, prop)
            {
              return obj[prop];
            },

            set : function(obj, prop, value)
            {
              let             origValue = value;
              let             old = Reflect.get(obj, prop);
              let             properties = obj.$handler.$properties[prop];

              // Is this a property?
              if (properties)
              {
                // Yup. Does it have an apply method?
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

                // Does it have a transform method?
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

function define(className, configuration)
{
  let             clazz;
  let             proxy;
  let             handler;
  let             path;
  let             classnameComponents;
  let             config = Object.create(configuration); // copy so can munge

  clazz = extend(
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
  }

  path = globalThis;
  classnameComponents = className.split(".");
  classnameComponents.forEach(
    (component, i) =>
    {
      let bExists = component in path;
      let isLast = i == classnameComponents.length - 1;

      if (! bExists && isLast)
      {
        path[component] = clazz;
        console.log("Created path ", path);
      }
      else if (! bExists)
      {
        path[component] = {};
      }
      else
      {
        throw new Error(
          `Namespace component ${component} from ${className} already exists exists`);
      }

      path = path[component];
    });

  return clazz;
}

let clazz = define("tester.Superclass", config);
console.log("clazz=", clazz);

let instance = new tester.Superclass();
console.log("instance=", instance);
console.log("num=" + instance.num);
console.log("str=" + instance.str);
console.log("running before=", instance.running);
instance.running = false;
console.log("running after assigning false=", instance.running);
instance.running = true;
console.log("running after assigning true first=", instance.running);
instance.running = true;
console.log("running after assigning true second=", instance.running);

// let subclass =
//     define(
//       "Subclass",
//       {
//         extend : 
//       });
// let subinstance = new subclass();
// console.log("sub num=" + subinstance.num);
// console.log("sub str=" + subinstance.str);
