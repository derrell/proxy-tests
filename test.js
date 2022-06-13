const { define, assert } = require("./define-class");

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
      this.base(arguments, bRunning); // super();
      this.publicMethod();
    },

    statics :
    {
      staticEntry : "I am static"
    },

    members :
    {
      publicMethod : function()
      {
        console.log("subclass publicMethod called");
        this.base(arguments);
      },

      _applyRunning : function(value, old)
      {
        console.log(
          `subclass apply running: value changing from ${old} to ${value}`);
        this.base(arguments, value, old);
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
    extend : Object,

    // Show how qx.data.Array could be indexed rather than getItem()
    proxyHandler :
    {
      get : function(target, prop)
      {
        // Ensure array store exists
        if (! target.arr)
        {
          target.initArr();
        }

        return target.getItem(prop);
      },

      set : function(target, prop, value)
      {
        // Ensure array store exists
        if (! target.arr)
        {
          target.initArr();
        }

        target.setItem(prop, value);
      }
    },

    properties :
    {
      arr :
      {
        initFunction : () =>
        {
          console.log("Allocating a new array object");
          return [];
        }
      }
    },

    construct : function()
    {
      this.base(arguments);
      for (let i = 0; i < 3; i++)
      {
        this.setItem(i, "Item " + i);
      }
    },

    members :
    {
      getItem(i)
      {
        return this.getArr()[i];
      },

      setItem(i, value)
      {
        console.log(`setItem ${i} to ${value}`);
        this.getArr()[i] = value;
      }
    }
  });


// Instantiate our superclass object and check member variable access
let superinstance = new tester.Superclass(false);
assert("superinstance.num == 23", superinstance.num == 23);
assert("superinstance.str == 'hello world'",
       superinstance.str == 'hello world');

// get and set property using new, getter/setter syntax
assert("running initial value === false", superinstance.running === false);
superinstance.running = true;
assert("running after assigning === true", superinstance.running === true);

// set property using traditional function syntax
superinstance.setRunning(false);
assert("running after setRunning(false) === false",
       superinstance.running === false);
assert("getRunning() returned false", superinstance.getRunning() === false);

// back to getter/setter syntax. The two syntaxes are interchangeable
superinstance.running = true;
assert("running after assigning true === true",
       superinstance.running === true);

// test check: "Boolean"'s togglePropertyName and isPropertyName functions
console.log("");
superinstance.toggleRunning();
assert("running after toggle === false", superinstance.running === false);
assert("isRunning() === false", superinstance.isRunning() === false);

let subinstance = new tester.Subclass(23, true);
console.log("");
assert("staticEntry === 'I am static'",
       tester.Subclass.staticEntry === 'I am static');
assert("sub num === 23", subinstance.num === 23);
assert("sub str === 'hello world'", subinstance.str === 'hello world');
assert("sub getRunning() === true", subinstance.getRunning() === true);
subinstance.running = false;
assert("sub after setting to false, sub getRunning() === false",
            subinstance.getRunning() === false);

let arr = new tester.Arr();
arr.setItem(3, 42);
assert("arr.getArr() === 'Item 0,Item 1,Item 2,42'",
       arr.getArr().toString() == 'Item 0,Item 1,Item 2,42');
arr[3] = 23;
assert("arr.getArr() === 'Item 0,Item 1,Item 2,23'",
       arr.getArr().toString() == 'Item 0,Item 1,Item 2,23');

//
// qx.Class and qx.Property implementation
//


