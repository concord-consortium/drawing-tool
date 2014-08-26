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

Palette.prototype.toggle = function () {
  if (this.$element.is(':visible')) {
    this._hide();
  } else {
    this._show();
  }
};

Palette.prototype._show = function () {
  this._position();
  this.$element.show();

  if (this.permanent) {
    return;
  }
  // Hide palette on first click / touch (if it's not permanent).
  // Timeout ensures that we won't catch the same event which actually
  // opened the palette.
  var self = this;
  setTimeout(function () {
    $(window).one('mousedown touchstart', function () {
      if (self.$element.is(':visible')) {
        self._hide();
      }
    });
  }, 16);
};

Palette.prototype._hide = function () {
  this.$element.hide();
};

Palette.prototype._position = function () {
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
