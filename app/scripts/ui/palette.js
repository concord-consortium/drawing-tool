function Palette(options, ui) {
  this.ui        = ui;
  this.name      = options.name;
  this.permanent = !!options.permanent;
  this.anchor    = options.anchor;
  this.$element  = $('<div>')
    .addClass('dt-palette')
    .addClass(options.vertical ? 'dt-vertical' : 'dt-horizontal');

  if (!this.permanent) {
    this.$element.hide();
  }
}

Palette.prototype.show = function () {
  this.position();
  this.$element.show();

  if (this.permanent) {
    return;
  }
  // Hide palette on first click / touch (if it's not permanent).
  var self = this;
  setTimeout(function () {
    $(document).one('mousedown touchstart', function () {
      setTimeout(function () {
        self.hide();
      }, 10);
    });
  }, 10);
};

Palette.prototype.hide = function (callback) {
  this.$element.hide();
};

Palette.prototype.position = function () {
  var anchorButton = this.anchor && this.ui.getButton(this.anchor);
  if (!anchorButton) {
    return;
  }
  var p = anchorButton.$element.position();
  this.$element.css({
    position: 'absolute',
    top:      p.top,
    left:     p.left + anchorButton.$element.outerWidth()
  });
};

module.exports = Palette;
