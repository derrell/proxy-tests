// TEMPORARY
qx.Class.define(
  "qx.core.Aspect",
  {
    type : "static",

    statics :
    {
      wrap(f)
      {
        return f;
      }
    }
  });
