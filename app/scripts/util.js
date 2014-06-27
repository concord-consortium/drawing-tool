function Util(){}

Util.dist = function (x1, y1, x2, y2){
  var dx2 = Math.pow(x1 - x2, 2),
      dy2 = Math.pow(y1 - y2, 2);
  return Math.sqrt(dx2 + dy2);
}

module.exports = Util;
