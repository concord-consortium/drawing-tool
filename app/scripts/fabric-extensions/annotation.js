var fabric = require('fabric').fabric;

(function() {

  'use strict';

  var extend = fabric.util.object.extend;

  if (fabric.Annotation) {
    fabric.warn('fabric.Annotation is already defined');
    return;
  }

  // from http://masf-html5.blogspot.com/2016/04/path-drawing-mode-lines-circles-arcs.html
  function drawArrow(ctx, fromx, fromy, tox, toy, arrowWidth, color) {
    //variables to be used when creating the arrow
    var headlen = 10;
    var angle = Math.atan2(toy-fromy,tox-fromx);

    ctx.save();
    ctx.strokeStyle = color;

    //starting path of the arrow from the start square to the end square
    //and drawing the stroke
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineWidth = arrowWidth;
    ctx.stroke();

    //starting a new path from the head of the arrow to one of the sides of
    //the point
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),
               toy-headlen*Math.sin(angle-Math.PI/7));

    //path from the side point of the arrow, to the other side point
    ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/7),
               toy-headlen*Math.sin(angle+Math.PI/7));

    //path from the side point back to the tip of the arrow, and then
    //again to the opposite side point
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),
               toy-headlen*Math.sin(angle-Math.PI/7));

    //draws the paths created above
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Annotation class
   * @class fabric.Annotation
   * @extends fabric.Text
   * @see {@link fabric.Arrow#initialize} for constructor definition
   */
  fabric.Annotation = fabric.util.createClass(fabric.IText, /** @lends fabric.Annotation.prototype */ {

    /**
     * Type of an object
     * @type String
     * @default
     */
    type: 'annotation',

     /**
     * Annotation arrow delta x
     * @type Number
     * @default
     */
     arrowDX: -50,

     /**
     * Annotation arrow delta y
     * @type Number
     * @default
     */
     arrowDY: 50,

    /**
     * @param {String} text Text value
     * @param {Object} options Component options (arrowDX, arrowDY)
     */
     initialize: function(text, options) {
      console.log({text, options})
      this.callSuper('initialize', text, options);

      this.set('arrowDX', options.arrowDX || -50);
      this.set('arrowDY', options.arrowDY || 50);
    },

    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    _render: function(ctx) {
      var margin = 10;
      var halfMargin = margin / 2;
      var doubleMargin = margin * 2;

      var box = {
        x: (-this.width / 2) - margin,
        y: (-this.height / 2) - halfMargin,
        width: this.width + doubleMargin,
        height: this.height + margin
      };

      drawArrow(ctx, box.x + (box.width / 2), box.y + (box.height / 2), box.x + this.arrowDX, box.y + this.arrowDY, 5, 'black');

      // draw bounding box
      // rounded version here: https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-using-html-canvas
      ctx.beginPath();
      ctx.fillStyle = '#fff';
      ctx.rect(box.x, box.y, box.width, box.height)
      ctx.stroke();
      ctx.fill();


      this.callSuper('_render', ctx);

      // TODO: draw arrow
    },

    /**
     * Returns object representation of an instance
     * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
     * @return {Object} object representation of an instance
     */
    toObject: function(propertiesToInclude) {
      return extend(this.callSuper('toObject', propertiesToInclude), {
        arrowDX: this.get('arrowDX'),
        arrowDY: this.get('arrowDY')
      });
    }
  });

  /**
   * Returns fabric.Annotation instance from an object representation
   * @static
   * @memberOf fabric.Annotation
   * @param {Object} object Object to create an instance from
   * @return {fabric.Annotation} instance of fabric.Annotation
   */
  fabric.Annotation.fromObject = function(object, callback) {
    return fabric.Object._fromObject('Annotation', object, callback);
  };

})();
