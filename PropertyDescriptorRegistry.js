/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Derrell Lipman (derrell)

************************************************************************ */

const { qx } = require("./define-class");

/**
 * @internal
 */
qx.Class.define(
  "qx.core.PropertyDescriptorRegistry",
  {
    extend : Object,

    construct : function()
    {
      // Initialize the registry of property descriptors
      this.__registry = {};
    },

    members :
    {
      /**
       * The registry of property descriptors
       *
       * The keys are property names.
       *
       * The values are property descriptor maps. Each property descriptor map
       * contains:
       *  - definition :
       *      The property definition from the configuration passed to
       *      qx.Class.define(), possibly munged slightly to add some detail
       *      used internally
       *
       *  - get
       *  - set
       *  - reset
       *  - refresh
       *  - setThemed
       *  - resetThemed
       *  - init
       *  - is
       *  - toggle
       *  - isAsyncSetActive
       *  - getAsync
       *  - setAsync
       *      Each is the function for obtaining information from the
       *      property, or manipulating the property. When the property
       *      descriptor is registered via `register`, these functions
       *      are bound to the `context` provided to the constructor.
       */
      __registry : null,

      /**
       * Register a property descriptor
       *
       * @param propertyName {String}
       *   The name of the property to which the property descriptor applies
       *
       * @param propertyDescriptor {Object}
       *   @see #__registry for the layout of a property descriptor
       */
      register : function(propertyName, propertyDescriptor)
      {
        // Save it to the registry.
        this.__registry[propertyName] = propertyDescriptor;
      },

      get : function(context, propertyName)
      {
        let       propertyDescriptor = this.__registry[propertyName];
        let       boundPropertyDescriptor = {};

        if (! propertyDescriptor)
        {
          return null;
        }

        // Clone it so user can't muck with our copy
        propertyDescriptor = Object.assign(propertyDescriptor);

        for (let key in propertyDescriptor)
        {
          // If this is not a function...
          if (typeof propertyDescriptor[key] != "function")
          {
            // ... then just copy it as is
            boundPropertyDescriptor[key] = propertyDescriptor[key];
            continue;
          }

          // Bind this function
          boundPropertyDescriptor[key] =
            propertyDescriptor[key].bind(context);
        }

        // Freeze the object so users can't accidentally modify it
        Object.freeze(boundPropertyDescriptor);

        return boundPropertyDescriptor;
      }
    }
  });
