module.exports = {
  dist: function dist(dx, dy){
    var dx2 = Math.pow(dx, 2);
    var dy2 = Math.pow(dy, 2);
    return Math.sqrt(dx2 + dy2);
  },

  // e is the mouse/touch event
  getLoc: function getLoc(e) {
    if (e instanceof MouseEvent) {
      return {
        x: e.layerX,
        y: e.layerY
      };
    } else if (e instanceof TouchEvent) {
      return {
        x: e.touches[0].clientX + e.layerX,
        y: e.touches[0].clientY + e.layerY
      }
    }
  }
};
