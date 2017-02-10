var $ = require('jquery');

function Palette(options, ui) {
  this.ui          = ui;
  this.name        = options.name;
  this.permanent   = !!options.permanent;
  this.hideOnClick = options.hideOnClick === undefined ? true : options.hideOnClick;
  this.anchor      = options.anchor;
  this.$element    = $('<div>')
    .addClass('dt-palette')
    .addClass(options.vertical ? 'dt-vertical' : 'dt-horizontal');

  this._closeOnClick = function (e) {
    if (!this.hideOnClick && (this.$element === e.target || this.$element.find(e.target).length > 0)) {
      return;
    }
    if (this.$element.is(':visible')) {
      this._hide();
    }
    this._clearWindowHandlers();
  }.bind(this);

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
    $(window).on('mousedown touchstart', this._closeOnClick);
  }.bind(this), 16);
};

Palette.prototype._hide = function () {
  this.$element.hide();
  this._clearWindowHandlers();
};

Palette.prototype._clearWindowHandlers = function () {
  $(window).off('mousedown touchstart', this._closeOnClick);
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
