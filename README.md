This is work in progress towards a reimplementation of the qooxdoo
Class and Property systems.

This is a mostly fresh implementation of qx.Bootstrap and qx.Class which implements classes using a Proxy. This avoid the necessity for implementing classes' properties using generated code, and greatly simplifies the qx.Bootstrap.define() and its property handling code.

# How to run tests
- The test program is `test.js` but the hierarchy of dependencies that
  must be defined prior to the test code is implmented in `boot.js`.
  Therefore, to run the test program, do:
  - `node boot.js`

# Legacy Class features currently implemented
- [x] type
  - [x] abstract
  - [x] static
  - [x] singleton
- [x] extend
- [ ] implement [Interfaces]
- [ ] include [Mixins]
- [x] construct
- [x] statics
- [x] properties
- [x] members
- [x] environment
- [x] events
- [x] defer
- [x] destruct
- [x] this.constructor
- [x] annotations
- [x] refresh()

# Legacy Property features currently implemented
- [x] check (currently just says what it would do)
- [x] stock check strings mapped to check methods
- [x] apply (as both string member name and as function)
- [x] event (currently just says what it would do)
  This implementation always generates an event. If there's no `event`
  key in the property definition, the event name is created
  automatically as `change${propertyFirstUp}`
- [x] themeable
- [x] inheritable
- [x] init
- [x] nullable
- [x] refine (currently allows complete redefinition of property)
- [x] transform
- [x] validate
- [x] dereference
- [x] deferredInit (deprecated; see `initFunction`, below)
- [x] isEqual
- [x] property groups
  - [x] name
  - [x] group
  - [x] mode
  - [x] themeable
- [x] generated methods
  - [x] getProperty()
  - [x] setProperty()
  - [x] initProperty()
  - [x] isProperty() -- if `check === "Boolean"`
  - [x] toggleProperty() -- if `check === "Boolean"`
  - [x] getPropertyAsync() -- if `async`
  - [x] setPropertyAsync() -- if `async` and `apply`
  - [x] setThemedProperty() -- if 'themeable'
  - [x] resetThemedProperty() -- if 'themeable'
  - [x] resetProperty() -- if 'inheritable'
  - [x] refreshProperty -- if 'inheritable'

# John's requested new Property features currently implemented
- [x] native properties
- [x] properties are first-class objects
  Additionally, there is now a qx.core.PropertyDescriptorRegistry
  class wich is automatically instantiated by qx.Class.define when a
  class is defined. It stores the definition of each property as well
  as each of the properties' functions. Retrieving a property's
  property descriptor binds the functions to the object on which the
  retrieval was made, so that they can be used from the retrieved
  property descriptor to get information about, or alter, that
  object's property.
- [x] readonly properties. `init` and `initFunction`, and therefore
  the`initProperty()` methods, intentionally ignore `readonly` so that
  the property's value can be set. This is true even if manually
  calling `initProperty()`. Since `initFunction` can and often will
  return a unique value, this technically voids the `readonly`
  contract, but seems like the right thing to do in this case.
- [x] storage can be completely replaced
- [?] eliminate need for pseudo-properties (maybe done?)
- [?] eliminate need for property sniffing/detection (maybe done?)
- [ ] support for private and protected properties
- [x] more advanced and reusable type checking
  Implemented parsing of JSDoc type strings (but then failing the
  check if it parsed because nothing yet validates the value against
  the AST
- [x] immutability

  Immutability -- altering the contents of an existing reference object rather
  than replacing that object when `set` is called -- is now easily implemented
  with the new replaceable storage facility, as shown below. Note that in this
  example, the property is initially set to `undefined` in storage's `init`.
  When `initFunction` is called, storage's `set` discovers that the property
  has no value yet, so assigns the designated array... the `initFunction`'s
  returned value. In all subsequent attempts to set the value of the property,
  the contents of the array are replaced within the originally installed
  array. That originally installed array object remains.

  ```
qx.Class.define(
  "tester.ImmutableArray",
  {
    extend : tester.Object,

    properties :
    {
      a :
      {
        check : "Array",
        initFunction : () => [],
        storage :
          {
            init(propertyName, property, clazz)
            {
              // Create the storage for this property's current value
              Object.defineProperty(
                clazz.prototype,
                propertyName,
                {
                  value        : undefined,
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
              if (this[prop] === undefined)
              {
                this[prop] = value;
                return;
              }
              this[prop].length = 0;
              Array.prototype.push.apply(this[prop], value);
            },

            dereference(prop, property)
            {
              // Called immediately after the destructor, if the
              // property has `dereference : true`.
              delete this[prop];
            }
          }
      }
    }
  });
  ```

- [x] mutation detection
- [ ] fast property definition
- [ ] integration with references
  - [x] `initFunction` (in lieu of `init`). Added to a property
    definition, this is a function that will be called with one
    argument: the property name. It is called when `initProperty()` is
    called, but calling `initProperty() is generally unnecessary, as
    the `initFunction` is called automatically, immediately before the
    constructor is called. The function should return the initial
    value. This allows a unique initial value, even if it's a
    reference type, per object instance.
  - [ ] hard
  - [ ] weak
  - [ ] soft
  - [ ] on-demand
  - [ ] transparant, async object destructors and garbage collection

# qx.data.Array features
- [x] indexed values accessed as if it were a native array
