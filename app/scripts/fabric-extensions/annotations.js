/*

Annotations Notes

Unlike other components in the drawing-tool annotations are composed of multiple entities on the canvas.

Each annotation is composed of:

1. An interactive text element for the text derived from Fabric.IText
2. A rect to set the background and rounded border derived from Fabric.Rect
3. A line that renders a custom arrowhead derived from Fabric.Line
4. A control point that is dynamically added in select mode derived from Fabric.Rect

These entities are tied together using a randomly generated UUID (v4) when the annotation is created.
This allows the entities to serialize separately but still interoperate when deserialized.

The initial implementation tried using Fabric groups but this didn't work out due to the group capturing
all the mouse events and bugs with the Fabric interactive text element when placed in a group.  There were
also issues with handling the arrow movement/length change while maintaining the origin left/top of the group.

This file contains all the core annotation functions and subclasses to implement annotations.  It exports one
function used in the annotation tool to handle annotation interactions.  The function is a singleton that
adds event handlers to the canvas.

Along with exporting a function this file also adds a group of functions in the fabric.Annotations "namespace"
so they can be shared outside the file and to act as a registry for each annotation entity using a tuple
of entity type + UUID.  This registry is what allows the canvas entities to "know" about each other and
handle updates to the text bounding box and location.

Finally this file adds the four annotation components to the fabric global as per the recommended way to
subclass components in the Fabric.js docs.

*/

var fabric = require('fabric').fabric;

function handleAnnotations(annotationTool) {
  var canvas = annotationTool.canvas;

  // only install handlers once
  if (canvas.__annotationsHandled) return;
  canvas.__annotationsHandled = true;

  // move the border and arrow when the text moves
  canvas.on('object:moving', (e) => {
    var annotationId = e.target.annotationId;
    if (
      annotationId &&
      e.target.type === fabric.AnnotationText.prototype.type
    ) {

      // find the associated objects
      const objects = {};
      canvas.forEachObject((object) => {
        if (object.annotationId === annotationId) {
          objects[object.type.replace("annotation-", "")] = object;
        }
      });

      const {text, border, arrow} = objects;
      if (!text || !border || !arrow) {
        return;
      }

      var newBorder = fabric.Annotations.calcBorderRect(text);
      if (border.left !== newBorder.left || border.top !== newBorder.top) {
        border.set(newBorder);
        canvas.requestRenderAll();
      }

      var p = fabric.Annotations.calcArrowPoints(text, arrow);
      if (arrow.x1 !== p[0] || arrow.y1 !== p[1]) {
        arrow.set({ x1: p[0], y1: p[1] });
        canvas.requestRenderAll();
      }
    }
  });

  // delete the associated elements when an annotation element is deleted (but ignore control point deletions)
  canvas.on('object:removed', (e) => {
    var annotationId = e.target && e.target.annotationId;
    if (
      annotationId &&
      e.target.type !== fabric.AnnotationControlPoint.prototype.type
    ) {
      canvas.forEachObject((object) => {
        if (object.annotationId === annotationId) {
          canvas.remove(object);
        }
      });
    }
  });

  canvas.on('text:editing:entered', (e) => {
    e.target.__annotationTextLastValue = e.target.hiddenTextarea.value;
    if (e.target.__annotationKeyUpHandler) {
      e.target.hiddenTextarea.removeEventListener("keyup", e.target.__annotationKeyUpHandler);
    }

    e.target.__annotationKeyUpHandler = (keyEvent) => {
      var key = keyEvent.key;
      var value = e.target.hiddenTextarea.value;
      if (((key === "Delete") || (key === "Backspace")) && (value === "") && (e.target.__annotationTextLastValue === "")) {
        e.target.hiddenTextarea.removeEventListener("keyup", e.target.__annotationKeyUpHandler);
        e.target.__annotationKeyUpHandler = null;
        canvas.remove(e.target);
      }
      e.target.__annotationTextLastValue = value;
    }
    e.target.hiddenTextarea.addEventListener("keyup", e.target.__annotationKeyUpHandler);
  });

  canvas.on('text:editing:exiting', (e) => {
    if (e.target.__annotationKeyUpHandler) {
      e.target.hiddenTextarea.removeEventListener("keyup", e.target.__annotationKeyUpHandler);
      e.target.__annotationKeyUpHandler = null;
    }
  });
}

module.exports = handleAnnotations;

(function () {
  'use strict';

  var extend = fabric.util.object.extend;

  if (fabric.Annotations) {
    fabric.warn('fabric.Annotations is already defined');
    return;
  }

  // common functions
  fabric.Annotations = {
    margin: 10,

    getObject: function (canvas, id, type) {
      return canvas.getObjects(type).find(object => object.annotationId === id);
    },

    getAllAnnotationIds: function (canvas) {
      return canvas.getObjects(fabric.AnnotationText.prototype.type).reduce((acc, cur) => {
        acc.push(cur.annotationId);
        return acc;
      }, []);
    },

    addControlPoint: function (annotationId, canvas) {
      var controlPoint = fabric.Annotations.getObject(
        canvas,
        annotationId,
        fabric.AnnotationControlPoint.prototype.type
      );
      if (controlPoint) {
        return;
      }

      var text = fabric.Annotations.getObject(
        canvas,
        annotationId,
        fabric.AnnotationText.prototype.type
      );
      var arrow = fabric.Annotations.getObject(
        canvas,
        annotationId,
        fabric.AnnotationArrow.prototype.type
      );
      if (!text || !arrow) {
        return;
      }

      controlPoint = new fabric.AnnotationControlPoint({
        annotationId,
        left: arrow.x2,
        top: arrow.y2,
        width: 12,
        height: 12,
        strokeWidth: 0,
        stroke: '#bcd2ff',
        fill: '#bcd2ff',
        hasControls: false,
        hasBorders: false,
        originX: 'center',
        originY: 'center'
      });

      controlPoint.on('moving', () => {
        var p = fabric.Annotations.calcArrowPoints(text, {
          x2: controlPoint.left,
          y2: controlPoint.top
        });
        arrow.set({ x1: p[0], y1: p[1], x2: p[2], y2: p[3] });
        canvas.requestRenderAll();
      });

      if (!canvas.contains(controlPoint)) {
        canvas.add(controlPoint);
      }
    },

    removeControlPoint: function (annotationId, canvas) {
      var controlPoint = fabric.Annotations.getObject(
        canvas,
        annotationId,
        fabric.AnnotationControlPoint.prototype.type
      );
      if (controlPoint) {
        controlPoint.off('moving');
        if (canvas.contains(controlPoint)) {
          canvas.remove(controlPoint);
        }
      }
    },

    addAllControlPoints: function (canvas) {
      fabric.Annotations.getAllAnnotationIds(canvas).forEach((id) => {
        fabric.Annotations.addControlPoint(id, canvas);
      });
    },

    removeAllControlPoints: function (canvas, exceptId) {
      fabric.Annotations.getAllAnnotationIds(canvas).forEach((id) => {
        if (id !== exceptId) {
          fabric.Annotations.removeControlPoint(id, canvas);
        }
      });
    },

    calcRect: function (el, delta) {
      return {
        left: el.left - delta,
        top: el.top - delta,
        width: el.width + delta * 2,
        height: el.height + delta * 2,
        dirty: true
      };
    },

    calcTextRect: function (border) {
      return this.calcRect(border, -this.margin);
    },

    calcBorderRect: function (text) {
      return this.calcRect(text, this.margin);
    },

    calcArrowPoints: function (text, arrow) {
      var borderRect = this.calcBorderRect(text);
      var right = borderRect.left + borderRect.width;
      var bottom = borderRect.top + borderRect.height;
      var midX = borderRect.left + borderRect.width / 2;
      var midY = borderRect.top + borderRect.height / 2;

      var x1;
      var y1;
      var x2 = arrow ? arrow.x2 : borderRect.left - 50;
      var y2 = arrow ? arrow.y2 : borderRect.top;

      var quarterPi = Math.PI / 4;
      var threeQuarterPi = 3 * quarterPi;
      var arrowAngle = Math.atan2(y2 - midY, x2 - midX);
      if (arrowAngle >= -quarterPi && arrowAngle <= quarterPi) {
        // right
        x1 = right;
        y1 = midY;
      } else if (arrowAngle >= quarterPi && arrowAngle <= threeQuarterPi) {
        // bottom
        x1 = midX;
        y1 = bottom;
      } else if (
        arrowAngle >= threeQuarterPi ||
        arrowAngle <= -threeQuarterPi
      ) {
        // left
        x1 = borderRect.left;
        y1 = midY;
      } else {
        // top
        x1 = midX;
        y1 = borderRect.top;
      }

      return [x1, y1, x2, y2];
    },

    removeControlPointsFromJSON: function (json) {
      if (json && json.objects && (json.objects.length > 0)) {
        json.objects = json.objects.filter(o => o.type !== fabric.AnnotationControlPoint.prototype.type);
      }
      return json;
    },

    disableControlsInJSON: function (json) {
      if (json && json.objects && (json.objects.length > 0)) {
        json.objects.forEach(o => {
          o.hasControls = false;
          o.hasBorders = false;
        });
      }
      return json;
    }
  };

  /**
   * AnnotationText class
   * @class fabric.AnnotationText
   * @extends fabric.Object
   * @see {@link fabric.AnnotationText#initialize} for constructor definition
   */
  fabric.AnnotationText = fabric.util.createClass(
    fabric.IText,
    /** @lends fabric.AnnotationText.prototype */ {
      type: 'annotation-text',

      /**
       * Annotation Id (uuid v4)
       * @type String
       * @default
       */
      annotationId: '',

      initialize: function (text, options) {
        this.callSuper('initialize', text, options);
        options = options || {};
        this.set('annotationId', options.annotationId);
      },

      containsPoint: function (point) {
        var borderRect = fabric.Annotations.calcBorderRect(this);
        return point.x >= borderRect.left && point.x <= borderRect.left + borderRect.width &&
               point.y >= borderRect.top && point.y <= borderRect.top + borderRect.height;
      },

      exitEditing: function() {
        // fire this before calling into the library so we have access to the hidden textarea
        // which isn't present when the 'text:editing:exited' event is fired
        if (this.canvas) {
          this.canvas.fire('text:editing:exiting', { target: this });
        }
        this.callSuper('exitEditing');
      },

      _renderTextCommon: function (ctx, method) {
        this.callSuper('_renderTextCommon', ctx, method);

        const annotationId = this.annotationId;
        let requestReRender = false;

        const border = this.canvas.getObjects(fabric.AnnotationBorder.prototype.type).find(object => object.annotationId === annotationId);
        if (border) {
          var newRect = fabric.Annotations.calcBorderRect(this);
          if (
            border.width !== newRect.width ||
            border.height !== newRect.height
          ) {
            border.set(newRect);
            requestReRender = true;
          }
        }

        const arrow = this.canvas.getObjects(fabric.AnnotationArrow.prototype.type).find(object => object.annotationId === annotationId);
        if (arrow) {
          var p = fabric.Annotations.calcArrowPoints(this, arrow);
          if (arrow.x1 !== p[0] || arrow.y1 !== p[1]) {
            arrow.set({ x1: p[0], y1: p[1] });
            requestReRender = true;
          }
        }

        if (requestReRender) {
          this.canvas.requestRenderAll();
        }
      },

      /**
       * Returns object representation of an instance
       * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
       * @return {Object} object representation of an instance
       */
      toObject: function(propertiesToInclude) {
        return extend(this.callSuper('toObject', propertiesToInclude), {
          annotationId: this.get('annotationId')
        });
      }
    }
  );

  /**
   * Returns fabric.AnnotationText instance from an object representation
   * @static
   * @memberOf fabric.AnnotationText
   * @param {Object} object Object to create an instance from
   * @return {fabric.AnnotationText} instance of fabric.AnnotationText
   */
  fabric.AnnotationText.fromObject = function(object, callback) {
    return fabric.Object._fromObject('AnnotationText', object, callback, 'text');
  };

  /**
   * AnnotationBorder class
   * @class fabric.AnnotationBorder
   * @extends fabric.Object
   * @see {@link fabric.AnnotationBorder#initialize} for constructor definition
   */
  fabric.AnnotationBorder = fabric.util.createClass(
    fabric.Rect,
    /** @lends fabric.AnnotationBorder.prototype */ {
      type: 'annotation-border',

      /**
       * Annotation Id (uuid v4)
       * @type String
       * @default
       */
      annotationId: '',

      initialize: function (options) {
        options = options || {};
        this.callSuper('initialize', options);
        this.set({
          annotationId: options.annotationId,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          hoverCursor: 'default'
        });
      },

      /**
       * Returns object representation of an instance
       * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
       * @return {Object} object representation of an instance
       */
      toObject: function(propertiesToInclude) {
        return extend(this.callSuper('toObject', propertiesToInclude), {
          annotationId: this.get('annotationId')
        });
      }
    }
  );

  /**
   * Returns fabric.AnnotationBorder instance from an object representation
   * @static
   * @memberOf fabric.AnnotationBorder
   * @param {Object} object Object to create an instance from
   * @return {fabric.AnnotationBorder} instance of fabric.AnnotationBorder
   */
  fabric.AnnotationBorder.fromObject = function(object, callback) {
    return fabric.Object._fromObject('AnnotationBorder', object, callback);
  };

  /**
   * AnnotationArrow class
   * @class fabric.AnnotationArrow
   * @extends fabric.Object
   * @see {@link fabric.AnnotationArrow#initialize} for constructor definition
   */
  fabric.AnnotationArrow = fabric.util.createClass(
    fabric.Line,
    /** @lends fabric.AnnotationArrow.prototype */ {
      /**
       * Type of an object
       * @type String
       * @default
       */
      type: 'annotation-arrow',

      /**
       * Annotation Id (uuid v4)
       * @type String
       * @default
       */
      annotationId: '',

      _drawArrow: function (ctx) {
        var fromx = this.x1;
        var fromy = this.y1;
        var tox = this.x2;
        var toy = this.y2;
        var arrowWidth = 5;

        // variables to be used when creating the arrowhead
        var headlen = 10;
        var angle = Math.atan2(toy - fromy, tox - fromx);

        ctx.save();
        ctx.strokeStyle = this.stroke;

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
        ctx.lineTo(
          tox - headlen * Math.cos(angle - Math.PI / 7),
          toy - headlen * Math.sin(angle - Math.PI / 7)
        );

        //path from the side point of the arrow, to the other side point
        ctx.lineTo(
          tox - headlen * Math.cos(angle + Math.PI / 7),
          toy - headlen * Math.sin(angle + Math.PI / 7)
        );

        //path from the side point back to the tip of the arrow, and then
        //again to the opposite side point
        ctx.lineTo(tox, toy);
        ctx.lineTo(
          tox - headlen * Math.cos(angle - Math.PI / 7),
          toy - headlen * Math.sin(angle - Math.PI / 7)
        );

        //draws the paths created above
        ctx.stroke();
        ctx.restore();
      },

      /**
       * @private
       * @param {CanvasRenderingContext2D} ctx Context to render on
       */
      render: function (ctx) {
        // don't call base render - the _drawArrow() handles it
        this._drawArrow(ctx);
      },

      initialize: function (points, options) {
        options = options || {};
        this.callSuper('initialize', points, options);
        this.set({
          annotationId: options.annotationId,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          hoverCursor: 'default'
        });
      },

      /**
       * Returns object representation of an instance
       * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
       * @return {Object} object representation of an instance
       */
      toObject: function(propertiesToInclude) {
        const extraProperties = {
          x1: this.x1,
          y1: this.y1,
          x2: this.x2,
          y2: this.y2,
          annotationId: this.get('annotationId')
        }
        return extend(this.callSuper('toObject', propertiesToInclude), extraProperties);
      }
    }
  );

  /**
   * Returns fabric.AnnotationArrow instance from an object representation
   * @static
   * @memberOf fabric.AnnotationArrow
   * @param {Object} object Object to create an instance from
   * @return {fabric.AnnotationArrow} instance of fabric.AnnotationArrow
   */
  fabric.AnnotationArrow.fromObject = function(object, callback) {
    object.points = [object.x1, object.y1, object.x2, object.y2];
    return fabric.Object._fromObject('AnnotationArrow', object, callback, 'points');
  };

  /**
   * AnnotationControlPoint class
   * @class fabric.AnnotationControlPoint
   * @extends fabric.Object
   * @see {@link fabric.AnnotationControlPoint#initialize} for constructor definition
   */
  fabric.AnnotationControlPoint = fabric.util.createClass(
    fabric.Rect,
    /** @lends fabric.AnnotationControlPoint.prototype */ {
      type: 'annotation-arrow-control-point',

      /**
       * Annotation Id (uuid v4)
       * @type String
       * @default
       */
      annotationId: '',

      initialize: function (options) {
        options = options || {};
        this.callSuper('initialize', options);
        this.set({
          annotationId: options.annotationId,
          hasControls: false,
          hasBorders: false
        });
      },

      /**
       * Returns object representation of an instance
       * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
       * @return {Object} object representation of an instance
       */
      toObject: function(propertiesToInclude) {
        return extend(this.callSuper('toObject', propertiesToInclude), {
          annotationId: this.get('annotationId')
        });
      }
    }
  );

  /**
   * Returns fabric.AnnotationControlPoint instance from an object representation
   * @static
   * @memberOf fabric.AnnotationControlPoint
   * @param {Object} object Object to create an instance from
   * @return {fabric.AnnotationControlPoint} instance of fabric.AnnotationControlPoint
   */
  fabric.AnnotationControlPoint.fromObject = function(object, callback) {
    return fabric.Object._fromObject('AnnotationControlPoint', object, callback);
  };

})();
