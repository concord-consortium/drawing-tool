var LineTool = require('scripts/tools/shape-tools/line-tool');

function basicWidthHeightTransform(s) {
  s.width = s.width * s.scaleX + s.strokeWidth * (s.scaleX - 1);
  s.height = s.height * s.scaleY + s.strokeWidth * (s.scaleY - 1);
  s.scaleX = 1;
  s.scaleY = 1;
}

// These handlers will be called during resizing (e.g. every single 1px change).
// Add handler here when you need "live" update, as otherwise resizing would look
// strange (e.g. due to incorrect stroke width).
var duringResize = {
  rect: function (s) {
    basicWidthHeightTransform(s);
  },
  ellipse: function (s) {
    basicWidthHeightTransform(s);
    s.rx = Math.abs(s.width / 2);
    s.ry = Math.abs(s.height / 2);
  },
  line: function (s) {
    basicWidthHeightTransform(s);
    if (s.x1 > s.x2) {
      s.x1 = s.left + s.width;
      s.x2 = s.left;
    } else {
      s.x2 = s.left + s.width;
      s.x1 = s.left;
    }
    if (s.y1 > s.y2) {
      s.y1 = s.top + s.height;
      s.y2 = s.top;
    } else {
      s.y2 = s.top + s.height;
      s.y1 = s.top;
    }
  },
  arrow: function (s) {
    this.line(s);
  },
  path: function (s) {
    for (var i = 0; i < s.path.length; i++) {
      s.path[i][1] *= s.scaleX;
      s.path[i][2] *= s.scaleY;
      s.path[i][3] *= s.scaleX;
      s.path[i][4] *= s.scaleY;
    }
    // We have two options to adjust width/height:
    // 1) this makes inaccurate bounding box dimensions but
    //    eliminates "floating" or weird behavior at edges
    basicWidthHeightTransform(s);
    // 2) this approach "floats" and has strange bugs but
    //    generates accurate bounding boxes
    // s.width = s.width * s.scaleX;
    // s.height = s.height * s.scaleY;
  }
};

// These handlers will be called just once, after resizing is complete.
// Add handler here when you don't need "live" update, as there is no
// visual difference between rescaling and resizing for given object type.
var afterResize = $.extend(true, {}, duringResize, {
  'i-text': function (s) {
    // Note that actually there is no rescale to resize transformation.
    // Rescaling is fine for text, we only just move scale from scaleX/Y
    // attributes to fontSize and strokeWidth.
    s.set({
      fontSize: s.get('fontSize') * s.get('scaleX'),
      strokeWidth: s.get('strokeWidth') * s.get('scaleX'),
      scaleX: 1,
      scaleY: 1
    });
    s.setCoords();
  }
});

// This function expects FabricJS canvas object as an argument.
// It replaces native FabricJS rescaling behavior with resizing.
module.exports = function rescale2resize(canvas) {
  canvas.on('object:scaling', function (opt) {
    var shape = opt.target;
    var type = shape.type;
    if (duringResize[type]) {
      duringResize[type](shape);
    }
  });

  canvas.on('object:modified', function (opt) {
    var shape = opt.target;
    var type = shape.type;
    if ((shape.scaleX !== 1 || shape.scaleY !== 1) && afterResize[type]) {
      afterResize[type](shape);
    }
  });

  fabric.Group.prototype.lockUniScaling = true;
  canvas.on('before:selection:cleared', function(opt) {
    var group = opt.target;
    // if the the selection wasn't on a scaled group, then
    // this function is not needed --> return
    if (group.type !== 'group' || group.scaleX === 1) { return; }

    var scale = group.scaleX;
    var items = group.getObjects();
    var tempStrokeWidth;
    for (var i = 0; i < items.length; i++) {
      if (afterResize[items[i].type] !== undefined) {

        // little hack to get adapt the current code
        // (eliminates the end of lines 2 and 3)
        tempStrokeWidth = items[i].strokeWidth;
        items[i].strokeWidth = 0;

        // temporarily apply the group scale to the objects so
        // the resizers work as intended
        items[i].scaleX = scale;
        items[i].scaleY = scale;

        afterResize[items[i].type](items[i]);

        items[i].strokeWidth = tempStrokeWidth * scale;

        // setting the scale factor so the scaling applied after
        // this function will have no effect
        items[i].scaleX = 1 / scale;
        items[i].scaleY = 1 / scale;
      }
    }
  });
};
