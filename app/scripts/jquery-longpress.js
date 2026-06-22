var $ = require('jquery');

$.fn.longPress = function(listener, timeout) {
  return this.on('mousedown touchstart', function (e) {
    // Only react to real pointer presses. Keyboard activation runs through
    // BasicButton#click -> triggerHandler('mousedown'), a synthetic event
    // with no matching mouseup, so its timer would never be cancelled and
    // the long-press would always fire (popping the palette open without
    // moving focus into it). Synthetic jQuery events have no originalEvent.
    if (!e.originalEvent) {
      return;
    }
    var timer;
    timer = setTimeout(function () {
      listener.call(this, e);
    }, timeout || 150);
    $(window).one('mouseup touchend touchcancel touchleave', function() {
      clearTimeout(timer);
    });
  });
};
