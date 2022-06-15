const { qx, assert } = require("./define-class");

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
//        readonly : true,
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

let subclassStorage =
    {
      externallyStored : 0
    };

qx.Class.define(
  "tester.Subclass",
  {
    extend : tester.Superclass,

    construct : function(num, bRunning)
    {
      console.log(`Subclass constructor: num=${num} bRunning=${bRunning}`);
      this.base(arguments, bRunning); // super();
      this.initExternallyStored();
      this.num = num;
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
      // },

      externallyStored :
      {
        init : 10,
        storage :
        {
          get(prop)
          {
            console.log("in externallyStored getter");
            return subclassStorage[prop];
          },

          set(prop, value)
          {
            console.log("in externallyStored setter");
            subclassStorage[prop] = value;
          }
        }
      },

      delay :
      {
        init : 0,
        async : true,
        get : async () =>
        {
          return new Promise(
            (resolve, reject) =>
            {
              setTimeout(() => { resolve(true); }, 2000);
            });
        },
        apply : async () =>
        {
          return new Promise(
            (resolve, reject) =>
            {
              setTimeout(() => { resolve(true); }, 2000);
            });
        }
      }
    }
  });

//
// Simulate qx.data.Array to demonstrate native-like access to array elements
//
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

qx.Class.define(
  "tester.Singleton",
  {
    type : "singleton",
    extend : tester.Superclass,

    construct : function()
    {
      this.base(arguments, true);
      console.log(`constructor displayname: ${this.constructor.$$displayName}`);
      console.log(`instance displayname: ${this.$$displayName}`);
    }
  });

qx.Class.define(
  "tester.Abstract",
  {
    type : "abstract",
    extend : tester.Superclass,

    construct : function()
    {
      this.base(arguments, true);
      console.log(`$displayname: ${this.$$displayName}`);
    },

    members :
    {
      doSomething : function()
      {
        throw new Error(`${this.$$displayName} is abstract}`);
      }
    }
  });

qx.Class.define(
  "tester.SubclassOfAbstract",
  {
    extend : tester.Abstract,

    members :
    {
      doSomething : function()
      {
        console.log("do something");
      }
    }
  });

(async () =>
  {
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

    // storage tests
    assert("initial value of externallyStored === 10",
           subclassStorage.externallyStored === 10);
    subinstance.externallyStored = 20;
    assert("post-change value of externallyStored === 20",
           subclassStorage.externallyStored === 20);
    assert("retrieved value of externallyStored === 20",
           subinstance.externallyStored === 20);

    let arr = new tester.Arr();
    arr.setItem(3, 42);
    assert("arr.getArr() === 'Item 0,Item 1,Item 2,42'",
           arr.getArr().toString() == 'Item 0,Item 1,Item 2,42');
    arr[3] = 23;
    assert("arr[3]=23 yields arr[3] === 23", arr[3] === 23);
    assert("arr.getArr() === 'Item 0,Item 1,Item 2,23'",
           arr.getArr().toString() == 'Item 0,Item 1,Item 2,23');

    console.log("");
    console.log("Testing native class extending qooxdoo class...");
    class NativeClass extends tester.Subclass
    {
      constructor()
      {
        super(13, false);
        assert("native class super(): num === 13", this.num === 13);
        this.num = 42;
        assert("native class assignment: num === 42", this.num === 42);
      }
    }
    let nativeClass = new NativeClass();

    //
    // TODO: Extending a qooxdoo class from a native class.
    //
    // We can't extend a qooxdoo class from a native class because
    // there's no way (that I've found yet) to call the constructor of
    // the native class without using `new NativeClass()`. This will have
    // to remain a work in progress...
    //
    // console.log("Testing qooxdoo class extending native class...");
    // qx.Class.define(
    //   "tester.SubNative",
    //   {
    //     extend : NativeClass,

    //     construct : function()
    //     {
    //       this.base(arguments);
    //       console.log("this.num=", this.num);
    //       assert("Class extended from native class: this.num === 42",
    //              this.num === 42);
    //     }
    //   });
    // let subNativeClass = new tester.SubNative();

    // Singleton tests
    try
    {
      let singleton = new tester.Singleton();

      // Fail. Shoould not have gotten here. Should have thrown.
      assert("new tester.Singleton() threw as expected", false);
    }
    catch(e)
    {
      // This is the success case. `new tester.Singleton()` should have thrown.
      assert("new tester.Singleton() threw as expected", true);
    }

    let singleton = tester.Singleton.getInstance();
    assert("tester.Singleton.getInstance() succeeded", true);

    // Abstract class tests
    try
    {
      let abstractClass = new tester.AbstractClass();

      // Fail. Shoould not have gotten here. Should have thrown.
      assert("new tester.Abstract() threw", false);
    }
    catch(e)
    {
      // This is the success case. `new tester.Abstract()` should have thrown.
      assert("new tester.Abstract() threw", true);
    }

    try
    {
      let subclassOfAbstract = new tester.SubclassOfAbstract();
      assert("new tester.SubclassOfAbstract() succeeded", true);
    }
    catch(e)
    {
      assert("new tester.SubclassOfAbstract() succeeded", false);
    }

    // Keep these delay tests last in the test...
    console.log("setting async delay property; should delay a few seconds");
    let startTime = new Date();
    await subinstance.setDelayAsync(0);
    console.log("returned from delay setter");
    assert("async setter delays more than 1 second",
           new Date().getTime() > startTime.getTime() + 1000);
    console.log("getting async delay property; should delay a few seconds");
    startTime = new Date();
    await subinstance.getDelayAsync();
    console.log("returned from delay getter");
    assert("async getter delays more than 1 second",
           new Date().getTime() > startTime.getTime() + 1000);
  })();

