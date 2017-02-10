var $ = require('jquery');

$.fn.longPress = function(listener, timeout) {
  return this.on('mousedown touchstart', function (e) {
    var timer;
    timer = setTimeout(function () {
      listener.call(this, e);
    }, timeout || 150);
    $(window).one('mouseup touchend touchcancel touchleave', function() {
      clearTimeout(timer);
    });
  });
};
