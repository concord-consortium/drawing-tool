// Converts drawing tool state JSON created using old version to the most recent one.
// Ensures that Drawing Tool is backward compatible.

var stateConverter = {
  0: convertVer0toVer1
  // In the future (in case of need):
  // 2: convertVer1toVer2
  // etc.
};

// Version 0 is using FabricJS 1.4.11
// Version 1 is using FabricJS 1.5.0
// New FabricJS version serializes paths in a different way, see:
// https://github.com/kangax/fabric.js/issues/2139
function convertVer0toVer1(state) {
  state.canvas.objects.forEach(function (obj) {
    if (obj.type === 'path') {
      obj.pathOffset.x = obj.left;
      obj.pathOffset.y = obj.top;
      var offsetX = obj.left - obj.width * 0.5;
      var offsetY = obj.top - obj.height * 0.5;
      var path = obj.path;
      for (var i = 0; i < path.length; i++) {
        var def = path[i];
        for (var j = 1; j < def.length; j++) {
          if (j % 2 === 1) {
            def[j] += offsetX;
          } else {
            def[j] += offsetY;
          }
        }
      }
    }
  });
  state.version = 1;
  return state;
}

function convertState(state) {
  if (typeof state.version === 'undefined') {
    state.version = 0;
  }
  while (stateConverter[state.version]) {
    state = stateConverter[state.version](state);
  }
  return state;
}

module.exports = convertState;
