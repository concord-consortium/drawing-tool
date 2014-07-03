module.exports = {
  dist: function dist(dx, dy){
    var dx2 = Math.pow(dx, 2);
    var dy2 = Math.pow(dy, 2);
    return Math.sqrt(dx2 + dy2);
  },

  // e is the mouse/touch event
  getLoc: function getLoc(e) {
    return {
      x: e.touches[0].clientX + e.layerX || e.layerX,
      y: e.touches[0].clientY + e.layerY || e.layerY
    }
  }
};
