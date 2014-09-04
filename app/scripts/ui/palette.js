function Palette(options, ui) {
  this.ui          = ui;
  this.name        = options.name;
  this.permanent   = !!options.permanent;
  this.hideOnClick = options.hideOnClick === undefined ? true : options.hideOnClick;
  this.anchor      = options.anchor;
  this.$element    = $('<div>')
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
  // Hide palette on first mousedown / touch (if it's not permanent).
  // Timeout ensures that we won't catch the same event which actually
  // opened the palette.
  setTimeout(function () {
    $(window).on('mousedown touchstart', closeOnClick);
  }, 16);

  var self = this;
  function closeOnClick (e) {
    if (!self.hideOnClick && (self.$element === e.target || self.$element.find(e.target).length > 0)) {
      return;
    }
    if (self.$element.is(':visible')) {
      self._hide();
    }
    $(window).off('mousedown touchstart', closeOnClick);
  }
};

Palette.prototype._hide = function () {
  this.$element.hide();
};

Palette.prototype._position = function () {
  var anchorButton = this.anchor && this.ui.getButton(this.anchor);
  if (!anchorButton) {
    return;
  }
  var p = anchorButton.$element.offset();
  var mainP = this.ui.getMainContainer().offset();
  this.$element.css({
    position: 'absolute',
    top:      p.top - mainP.top,
    left:     p.left + anchorButton.$element.outerWidth() - mainP.left,
  });
};

module.exports = Palette;
