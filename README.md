This is work in progress towards a reimplementation of the qooxdoo
Class and Property systems.

# Code organization
The code that will eventually move into qx.Class (and possibly
qx.core.Property, although it's yet to be determined if that is even
needed), is in `define-class.js`. For simplicity of testing, this file
is currently a `require()`d module. It won't, of course, be such in
its final implementation.

The test program is `test.js`.

# How to run tests
- node test.js

# Legacy Class features currently implemented
- [ ] type
  - [ ] abstract
  - [ ] static
  - [ ] singleton
- [x] extend
- [ ] implement [Interfaces]
- [ ] include [Mixins]
- [x] construct
- [x] statics
- [x] properties
- [x] members
- [ ] environment
- [ ] events
- [ ] defer
- [ ] destruct

# Legacy Property features currently implemented
- [x] check (currently just says what it would do)
- [ ] stock check strings mapped to check methods
- [x] apply (as both string member name and as function)
- [x] event (currently just says what it would do)
- [ ] themeable
- [ ] inheritable
- [x] init
- [ ] nullable
- [x] refine (currently allows complete redefinition of property)
- [x] transform
- [ ] validate
- [ ] dereference
- [ ] deferredInit (deprecated; see `initFunction`, below)
- [ ] isEqual
- [ ] property groups
  - [ ] name
  - [ ] group
  - [ ] mode
  - [ ] themeable
- [ ] generated methods
  - [x] getProperty()
  - [x] setProperty()
  - [x] initProperty()
  - [x] isProperty() if `check === "Boolean"`
  - [x] toggleProperty() if `check === "Boolean"`
  - [x] getPropertyAsync() if `async`
  - [x] setPropertyAsync() if `async` and `apply`
  - [ ] resetProperty()
  - [ ] setThemedProperty()
  - [ ] resetThemedProperty()

# John's requested new Property features currently implemented
- [x] native properties
- [x] properties are first-class objects
- [x] storage can be completely replaced
- [?] eliminate need for pseudo-properties (maybe done?)
- [?] eliminate need for property sniffing/detection (maybe done?)
- [ ] support for private and protected properties
- [ ] more advanced and reusable type checking
- [ ] immutability and mutation detection
- [ ] fast property definition
- [ ] integration with references
  - [x] initFunction (in lieu of init). Added to a property
    definition, this is a function that will be called with no
    arguments, when `initProperty()` is called. The function
    should return the initial value. This allows a unique initial
    value, even if it's a reference type, per object instance.
  - [ ] hard
  - [ ] weak
  - [ ] soft
  - [ ] on-demand
  - [ ] transparant, async object destructors and garbage collection

# qx.data.Array features
- [x] indexed values accessed as if it were a native array