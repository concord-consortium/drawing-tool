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
    s.rx = s.width / 2;
    s.ry = s.height / 2;
  },
  circle: function (s) {
    uniformWidthHeightTransform(s);
    s.radius = s.width / 2;
  },
  square: function (s) {
    uniformWidthHeightTransform(s);
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
};
