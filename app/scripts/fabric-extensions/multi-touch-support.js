module.exports = function addMultiTouchSupport(canvas) {
  if (typeof Hammer === 'undefined' || !fabric.isTouchSupported) {
    return;
  }
  var mc = new Hammer.Manager(canvas.upperCanvasEl);
  mc.add(new Hammer.Pinch());

  var initialAngle;
  var initialScale;

  mc.on('pinchstart', function (e) {
    var target = getTarget();
    if (!target || isLine(target)) {
      return;
    }
    setLocked(target, true);
    initialAngle = target.get('angle');
    initialScale = target.get('scaleX');
  });

  mc.on('pinchmove', function (e) {
    var target = getTarget();
    if (!target || isLine(target)) {
      return;
    }
    target.set({
      scaleX: e.scale * initialScale,
      scaleY: e.scale * initialScale,
      angle: initialAngle + e.rotation
    });
    canvas.fire('object:scaling', {target: target, e: e.srcEvent});
    if (target.get('scaleX') !== e.scale * initialScale) {
      // rescale-2-resize mod used.
      initialScale = 1 / e.scale;
    }
  });

  mc.on('pinchend', function (e) {
    var target = getTarget();
    if (!target || isLine(target)) {
      return;
    }
    setLocked(target, false);
  });

  function isLine(object) {
    return object.type === 'line' || object.type === 'arrow';
  }

  function getTarget() {
    return canvas.getActiveObject() || canvas.getActiveGroup();
  }

  function setLocked(target, v) {
    target.set({
      lockMovementX: v,
      lockMovementY: v,
      lockScalingX: v,
      lockScalingY: v
    });
  }
};
