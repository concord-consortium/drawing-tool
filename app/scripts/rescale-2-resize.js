var LineTool = require('scripts/tools/line-tool');

function basicWidthHeightTransform(s) {
  s.width = s.width * s.scaleX + s.strokeWidth * (s.scaleX - 1);
  s.height = s.height * s.scaleY + s.strokeWidth * (s.scaleY - 1);
}

function uniformWidthHeightTransform(s) {
  basicWidthHeightTransform(s);
  if (s.scaleX !== 1) {
    s.height = s.width;
  } else {
    s.width = s.height;
  }
}

var resizers = {
  rect: function (s) {
    basicWidthHeightTransform(s);
  },
  ellipse: function (s) {
    basicWidthHeightTransform(s);
    s.rx = Math.abs(s.width / 2);
    s.ry = Math.abs(s.height / 2);
  },
  circle: function (s) {
    uniformWidthHeightTransform(s);
    s.radius = Math.abs(s.width / 2);
  },
  square: function (s) {
    uniformWidthHeightTransform(s);
  },
  line: function (s) {
    basicWidthHeightTransform(s);

    s.prevTop = s.top;
    s.prevLeft = s.left;

    if (s.x1 > s.x2) { s.x1 = s.left + s.width; s.x2 = s.left; }
    else { s.x2 = s.left + s.width; s.x1 = s.left; }

    if (s.y1 > s.y2) { s.y1 = s.top + s.height; s.y2 = s.top; }
    else { s.y2 = s.top + s.height; s.y1 = s.top; }
  },
  path: function (s) {
    // we have two options to adjust width/height:

    // 1) this makes inaccurate bounding box dimensions but
    //    eliminates "floating" or weird behavior at edges
    basicWidthHeightTransform(s);

    // 2) this approach "floats" and has strange bugs but
    //    generates accurate bounding boxes
    // s.width = s.width * s.scaleX;
    // s.height = s.height * s.scaleY;

    for (var i = 0; i < s.path.length; i++) {
      s.path[i][1] *= s.scaleX;
      s.path[i][2] *= s.scaleY;
      s.path[i][3] *= s.scaleX;
      s.path[i][4] *= s.scaleY;
    }
  }
};

// This function expects FabricJS canvas object as an argument.
// It replaces native FabricJS rescaling behavior with resizing.
module.exports = function rescale2resize(canvas) {
  canvas.on('object:scaling', function (opt) {
    var shape = opt.target;
    // Support custom Drawing Tool shape types (e.g. "square" which is
    // not supported in FabricJS).
    var type = shape.dtType || shape.type;
    if (resizers[type] !== undefined) {
      resizers[type](shape);
      shape.scaleX = 1;
      shape.scaleY = 1;
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
      if (resizers[items[i].type] !== undefined) {

        // little hack to get adapt the current code
        // (eliminates the end of lines 2 and 3)
        tempStrokeWidth = items[i].strokeWidth;
        items[i].strokeWidth = 0;

        // temporarily apply the group scale to the objects so
        // the resizers work as intended
        items[i].scaleX = scale;
        items[i].scaleY = scale;

        resizers[items[i].type](items[i]);

        items[i].strokeWidth = tempStrokeWidth * scale;

        // setting the scale factor so the scaling applied after
        // this function will have no effect
        items[i].scaleX = 1 / scale;
        items[i].scaleY = 1 / scale;
      }
    }
  });
};
