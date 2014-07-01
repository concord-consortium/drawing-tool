var Handle = fabric.util.CreateClass(fabric.Circle,{
  initialize: function(obj, corner, options) {
    this.callSuper('initialize', options);
    this.source = obj;
    this.corner = corner;
  },

  _render: function(ctx) {
    this.callSuper('_render', ctx);

    //draw a circle
    ctx.beginPath();
    ctx.arc(75, 75, 10, 0, Math.PI*2, true);
    ctx.closePath();
    ctx.fill();
  }
})

module.exports = Handle;
