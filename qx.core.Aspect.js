// TEMPORARY
qx.Class.define(
  "qx.core.Aspect",
  {
    type : "static",

    statics :
    {
      wrap : function(fullName, f, type)
      {
        return f;
      }
    }
  });
