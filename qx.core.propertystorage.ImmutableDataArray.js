/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2022 Derrell Lipman

   License:
     MIT: https://opensource.org/licenses/MIT
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Derrell Lipman (derrell)

************************************************************************ */

qx.Bootstrap.define(
  "qx.core.propertystorage.ImmutableDataArray",
  {
    type : "static",

    /*
     * This class must implement the
     * qx.core.propertystorage.IStorage... yet an Interface is not
     * allowed to require static functions. Assume that inteface
     * represents the requirements here, but don't actually
     * "implement" it.
     *
     * implement : [ qx.core.propertystorage.IStorage ],
     */

    statics :
    {
      init : qx.core.propertystorage.Default.init,

      get : qx.core.propertystorage.Default.get,

      set(prop, value)
      {
        // The storage `init` method created the property with initial
        // value`undefined`, so if it's undefined, this is a call from
        // the property's `init` or `initFunction`.
        if (this[prop] === undefined)
        {
          this[prop] = value;
          return;
        }

        // Otherwise, they're providing a new value. Instead of
        // replacing the qx.data.Array itself, we replace the contents
        // of the existing qx.data.Array.
        //
        // FIXME: Is this the correct way to replace the contents of a
        // data array???
        this[prop].replace(value);
      },

      dereference : qx.core.propertystorage.Default.dereference,
    }
  });
