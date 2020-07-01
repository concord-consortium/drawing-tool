var fabric = require('fabric').fabric;

module.exports = function addMultiTouchSupport(canvas) {
  if (typeof Hammer === 'undefined' || !fabric.isTouchSupported) {
    return;
  }
  var mc = new Hammer.Manager(canvas.upperCanvasEl);
  mc.add(new Hammer.Pinch());

  var initialAngle;
  var initialScale;
  var shouldCenterOrigin;
  var originalOriginX;
  var originalOriginY;

  mc.on('pinchstart', function (e) {
    var target = getTarget();
    if (!target || isLine(target)) {
      return;
    }
    setLocked(target, true);
    initialAngle = target.get('angle');
    initialScale = target.get('scaleX');
    // While performing multi-touch gestures like pinch and zoom, it feels more natural
    // when origin is in center.
    shouldCenterOrigin = target.originX !== 'center' || target.originY !== 'center';
    if (shouldCenterOrigin) {
      setOriginToCenter(target);
    }
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

    fire(target, 'scaling', e.srcEvent);
    fire(target, 'rotating', e.srcEvent);

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
    if (shouldCenterOrigin) {
      resetOrigin(target);
    }
    setLocked(target, false);
    // In theory we should also call:
    // fire(target, 'modified', e.srcEvent);
    // but fabric automatically fies 'modified' event on mouseup.
  });

  function isLine(object) {
    return object.type === 'line' || object.type === 'arrow';
  }

  function getTarget() {
    var objs = canvas.getActiveObjects();
    if (objs.length) return objs[0];
  }

  function setLocked(target, v) {
    target.set({
      lockMovementX: v,
      lockMovementY: v,
      lockScalingX: v,
      lockScalingY: v
    });
  }

  function fire(target, eventName, e) {
    canvas.fire('object:' + eventName, {target: target, e: e});
    target.fire(eventName, {e: e});
  }

  // Note that these functions are based on Fabric's _setOriginToCenter and _resetOrigin
  // (as they are marked as private).
  function setOriginToCenter(object) {
    originalOriginX = object.originX;
    originalOriginY = object.originY;

    var center = object.getCenterPoint();

    object.originX = 'center';
    object.originY = 'center';
    object.left = center.x;
    object.top = center.y;
  }

  function resetOrigin(object) {
    var originPoint = object.translateToOriginPoint(
      object.getCenterPoint(),
      originalOriginX,
      originalOriginY);

    object.originX = originalOriginX;
    object.originY = originalOriginY;

    object.left = originPoint.x;
    object.top = originPoint.y;
  }
};
