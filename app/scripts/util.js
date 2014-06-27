function Util(){}

Util.dist = function (dx, dy){
  var dx2 = Math.pow(dx, 2),
      dy2 = Math.pow(dy, 2);
  return Math.sqrt(dx2 + dy2);
}

module.exports = Util;
