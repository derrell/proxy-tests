const { qx, assert } = require("./define-class");

qx.Class.define(
  "tester.Object",
  {
    extend : Object,

    members :
    {
      dispose : function()
      {
        let             clazz = this.constructor;

        while (clazz.superclass)
        {
          // Processing this class...
          if (clazz.$$destructor)
          {
            clazz.$$destructor.call(this);
          }

          // // Destructor support for mixins
          // if (clazz.$$includes)
          // {
          //   let             mixins = clazz.$$flatIncludes;

          //   for (var i = 0, l = mixins.length; i < l; i++)
          //   {
          //     if (mixins[i].$$destructor)
          //     {
          //       mixins[i].$$destructor.call(this);
          //     }
          //   }
          // }

          // Jump up to next super class
          clazz = clazz.superclass;
        }
      }
    }
  });

qx.Class.define(
  "tester.Superclass",
  {
    extend : tester.Object,

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
        },
        isEqual : function(a, b)
        {
          return a === b;
        }
      },

      nullableProp :
      {
        init : 10,
        check : "Number",
        nullable : true
      },

      nonNullableProp :
      {
        init : 10,
        check : "Number",
        nullable : false
      },

      jsdocProp :
      {
        initFunction : () => [ 10, 20, 30 ],
        check : "Array<Number>"
      },

      mustBe42 :
      {
        init : 0,
        check : "value === 42"
      },

      positive :
      {
        init : 1,
        check : "Number",
        validate : function(value)
        {
          if (value <= 0)
          {
            throw new Error("value must be greater than 0");
          }
        }
      },

      readOnly :
      {
        initFunction : () => 42,
        readonly : true
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
        if (value === old)
        {
          throw new Error(
            "superclass: _applyRunning called with identical value");
        }

        console.log(
          `superclass apply running: value changing from ${old} to ${value}`);
      }
    }
  });

let subclassStorage;

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
          init(propertyName, property)
          {
            subclassStorage =
              {
                externallyStored : 0
              };
          },

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
          return new qx.Promise(
            (resolve, reject) =>
            {
              setTimeout(
                () =>
                {
                  resolve(true);
                },
                1200);
            });
        },
        apply : async () =>
        {
          return new qx.Promise(
            (resolve, reject) =>
            {
              setTimeout(
                () =>
                {
                  resolve(true);
                },
                1200);
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
    extend : tester.Object,

    // Show how qx.data.Array could be indexed rather than getItem()
    proxyHandler :
    {
      get : function(target, prop)
      {
        return target.getItem(prop);
      },

      set : function(target, prop, value)
      {
        target.setItem(prop, value);
      }
    },

    properties :
    {
      arr :
      {
        initFunction : function(key)
        {
          console.log(`Allocating a new array object for property '${key}'`);
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

    environment :
    {
      "tester.greeting" : "hi there"
    },

    properties :
    {
      recentGreeting :
      {
        check : "String",
        init : "uninitialized"
      }
    },

    events :
    {
      myNormalEvent : "qx.event.type.Event",
      myDataEvent : "qx.event.type.Data"
    },

    members :
    {
      getGreeting : function()
      {
        this.recentGreeting = qx.core.Environment.get("tester.greeting");
        return this.getRecentGreeting();
      }
    },

    defer : function(clazz, members, properties)
    {
      console.log("Class keys:");
      Object.keys(clazz).forEach((key) => console.log(`\t${key}`));

      console.log("Member keys:");
      Object.keys(members).forEach((key) => console.log(`\t${key}`));

      console.log("Propeties:");
      console.log(JSON.stringify(properties, null, "  "));
    }
  });

try
{
  qx.Class.define(
    "tester.StaticClass",
    {
      type : "static",
      extend : tester.Superclass,
    });

  // This should have failed
  assert("'extend' in 'static' class throws error", false);
}
catch(e)
{
  console.log(e.toString());
  assert("'extend' in 'static' class throws error", true); // success
}

try
{
  qx.Class.define(
    "tester.StaticClass",
    {
      type : "static",
      members :
      {
        int : 23
      }
    });

  // This should have failed
  assert("'members' in 'static' class throws error", false);
}
catch(e)
{
  console.log(e.toString());
  assert("'members' in 'static' class throws error", true); // success
}

qx.Class.define(
  "tester.StaticClass",
  {
    statics :
    {
      success : "It worked!"
    }
  });

// This should succeed, with assumed type: "static"
assert("missing 'type' without 'extend' assumes 'static'", true);

// Test annotations
qx.Class.define(
  "tester.Annotations",
 {
   extend : tester.Object,

   "@construct" : ["construct-anno"],
   "@destruct" : ["destruct-anno"],

   properties :
   {
     alpha :
     {
       init : null,
       nullable : true,
       "@" : ["property-alpha-anno"]
     }
   },

   members:
   {
     "@methodA" : ["method-a-anno"],
     methodA()
     {
     }
   },

   statics:
   {
     "@staticA" : ["static-a-anno"],
     staticA()
     {
       return true;
     }
   }
 });

qx.Class.define(
  "tester.LayoutParent",
  {
    extend : tester.Superclass,

    construct : function()
    {
      console.log(`LayoutParent constructor`);
      this.base(arguments, false);
      console.log("positive=", this.positive);
      this.positive = 2;
      console.log("positive=", this.positive);
    },

    properties :
    {
    }
  });

let layoutParent;

qx.Class.define(
  "tester.LayoutChild",
  {
    extend : tester.Object,

    properties :
    {
      positive :
      {
        init : "inherit",
        inheritable : true
      },

      mustBeDereferenced :
      {
        initFunction : () => "hello world",
        dereference : true
      }
    },

    members :
    {
      getLayoutParent : function()
      {
        return layoutParent;
      }
    }
  });


(async () =>
  {
    // validate toString() of class definition
    assert("tester.Superclass.toString() yields '[Class tester.Superclass]'",
           tester.Superclass.toString() === "[Class tester.Superclass]");

    // instantiate our superclass object and check member variable access
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
    subinstance.num = 24;
    assert("sub num === 24", subinstance.num === 24);
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

    let subclassOfAbstract;
    try
    {
      subclassOfAbstract = new tester.SubclassOfAbstract();
      assert("new tester.SubclassOfAbstract() succeeded", true);

      // Test environment settings
      let greeting = subclassOfAbstract.getGreeting();
      assert("greeting from environment === 'hi there'",
             greeting === "hi there");

      // Ensure events got added
      assert("events list is created correctly",
             JSON.stringify(subclassOfAbstract.constructor.$$events) ===
             '{' +
             '"changeRecentGreeting":"qx.event.type.Data",' +
             '"myNormalEvent":"qx.event.type.Event",' +
             '"myDataEvent":"qx.event.type.Data"' +
             '}');
    }
    catch(e)
    {
      assert("new tester.SubclassOfAbstract() succeeded", false);
    }

    try
    {
      let staticClass = new tester.StaticClass();
      assert("new tester.StaticClass() failed as expected", false);
    }
    catch(e)
    {
      assert("new tester.StaticClass() failed as expected", true);
    }

    assert("tester.StaticClass.success === 'It worked!'",
           tester.StaticClass.success === "It worked!");


    let anno = new tester.Annotations();
    assert("annotations created correctly",
           JSON.stringify(anno.constructor.$$annotations) ===
           '{' +
           '"@construct":["construct-anno"],' +
           '"@destruct":["destruct-anno"],' +
           '"statics":{"staticA":["static-a-anno"]},' +
           '"members":{"methodA":["method-a-anno"]},' +
           '"properties":{"alpha":["property-alpha-anno"]}' +
           '}');

    // Test nullable
    try
    {
      superinstance.nullableProp = null;
      assert("nullable property can be set to null", true);
    }
    catch(e)
    {
      assert("nullable property can be set to null", false);
    }

    try
    {
      superinstance.nonNullableProp = null;
      assert("non-nullable property can not be set to null", false);
    }
    catch(e)
    {
      assert("non-nullable property can not be set to null", true);
    }

    // Test validate
    try
    {
      superinstance.positive = 1;
      assert("validated property can be set to legal value", true);
    }
    catch(e)
    {
      assert("validated property can be set to legal value", false);
    }

    try
    {
      superinstance.setPositive(-1);
      assert("validated property can not be set to illegal value", false);
    }
    catch(e)
    {
      assert("validated property can not be set to illegal value", true);
    }

    // Test readonly
    try
    {
      superinstance.readOnly = 0;
      assert("readonly property can not be set", false);
    }
    catch(e)
    {
      assert("readonly property can not be set", true);
    }

    // Test inheritable
    layoutParent = new tester.LayoutParent();
    assert("layoutParent.positive === 2", layoutParent.getPositive() === 2);
    let layoutChild = new tester.LayoutChild();
    assert("layoutChild.positive === 'inherit'",
           layoutChild.positive === "inherit");
    layoutChild.refresh();
    assert("layoutChild.positive === 2", layoutChild.positive === 2);

    // test dereference
    assert("layoutChild.mustBeDereferenced === 'hello world'",
           layoutChild.mustBeDereferenced === "hello world");
    layoutChild.dispose();
    assert("layoutChild.mustBeDereferenced is undefined after dispose()",
           typeof layoutChild.mustBeDereferenced == "undefined");

    // Test checks
    try
    {
      superinstance.running = 23;
      assert("check 'Boolean' failed as it should", false);
    }
    catch(e)
    {
      assert("check 'Boolean' failed as it should", true);
    }

    try
    {
      superinstance.running = true;
      superinstance.running = false;
      assert("check 'Boolean' succeeded as it should", true);
    }
    catch(e)
    {
      assert("check 'Boolean' succeded as it should", false);
    }

    try
    {
      superinstance.jsdocProp = [ 2, 4, 6 ];
      assert("check JSDoc failed as expected (not yet implemented)", false);
    }
    catch(e)
    {
      assert("check JSDoc failed as expected (not yet implemented)", true);
    }

    try
    {
      superinstance.mustBe42 = 42;
      assert("check-string succeeded as it should", true);
    }
    catch(e)
    {
      assert("check-string succeeded as it should", false);
    }

    try
    {
      superinstance.mustBe42 = 43;
      assert("check-string failed as it should", false);
    }
    catch(e)
    {
      assert("check-string failed as it should", true);
    }


    //
    // Keep these delay tests last in the test...
    //
    console.log("setting async delay property; should delay a few seconds");
    let startTime = new Date();
    let p = subinstance.setDelayAsync(0); // returns a promise
    let date = new Date();
    let interval = setInterval(
      () =>
      {
        console.log("while awaiting setDelayAsync: isAsyncSetActiveDelay=",
                    subinstance.isAsyncSetActiveDelay());
      },
      200);
    await p;
    clearInterval(interval);
    console.log("after awaiting setDelayAsync: isAsyncSetActiveDelay=",
                subinstance.isAsyncSetActiveDelay());
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

