var $ = require('jquery');

// Palette ids must be unique across the whole page (they are referenced by
// aria-controls) and one page may host several drawing tool instances.
var _paletteIdx = 0;

function Palette(options, ui) {
  this.ui          = ui;
  this.name        = options.name;
  this.permanent   = !!options.permanent;
  this.hideOnClick = options.hideOnClick === undefined ? true : options.hideOnClick;
  this.anchor      = options.anchor;
  this.id          = 'dt-palette-' + _paletteIdx++;
  this.$element    = $('<div>')
    .attr('id', this.id)
    .addClass('dt-palette')
    .addClass(options.vertical ? 'dt-vertical' : 'dt-horizontal');

  if (options.label) {
    this.$element.attr('role', 'group').attr('aria-label', options.label);
  }

  this.topOffset = options.hasOwnProperty('topOffset') ? options.topOffset : 0;
  this.leftOffset = options.hasOwnProperty('leftOffset') ? options.leftOffset : 0;

  this._closeOnClick = function (e) {
    if (!this.hideOnClick && (this.$element === e.target || this.$element.find(e.target).length > 0)) {
      return;
    }
    if (this.$element.is(':visible')) {
      this._hide();
    }
    this._clearWindowHandlers();
  }.bind(this);

  // Close the palette when keyboard focus moves out of it. Mirrors the
  // mousedown auto-hide for mouse users. During a focusout event the
  // browser may not have focused the new element yet, so check
  // relatedTarget rather than document.activeElement.
  this._onFocusOut = function (e) {
    // Palettes that stay open on click (hideOnClick: false) are also kept
    // open on focusout. They anchor child palettes (stamp categories ->
    // category stamps); a child palette is a sibling div, not nested here,
    // so moving focus into it would otherwise auto-hide this parent and
    // break the child's focus restoration to an anchor that is now hidden.
    // These palettes are closed with Escape (see _onKeyDown) instead.
    if (!this.hideOnClick) {
      return;
    }
    var newTarget = e.relatedTarget;
    if (newTarget && (this.$element.is(newTarget) || this.$element.find(newTarget).length > 0)) {
      return;
    }
    if (this.$element.is(':visible')) {
      this._hide();
    }
  }.bind(this);

  // Keyboard handling inside an open palette. Palette options are not
  // individual Tab stops (they are tabindex="-1", set in
  // UIManager._setupKeyboardNavigation), so Arrow / Home / End are the only
  // way to move between them. Escape closes the palette; _hide returns
  // focus to the anchor button.
  this._onKeyDown = function (e) {
    if (e.keyCode === 27 /* Escape */) {
      e.stopPropagation();
      this._hide();
      return;
    }
    var $btns = this.$element.find('.dt-btn');
    if (!$btns.length) {
      return;
    }
    var idx = $btns.index(document.activeElement);
    var target = null;
    switch (e.keyCode) {
      case 37: /* ArrowLeft  */
      case 38: /* ArrowUp    */ target = idx - 1; break;
      case 39: /* ArrowRight */
      case 40: /* ArrowDown  */ target = idx + 1; break;
      case 36: /* Home       */ target = 0; break;
      case 35: /* End        */ target = $btns.length - 1; break;
      default: return;
    }
    e.preventDefault();
    var n = $btns.length;
    $btns.eq((target % n + n) % n).trigger('focus');  // wraps both ends
  }.bind(this);

  if (!this.permanent) {
    this.$element.hide();
    this.$element.on('focusout', this._onFocusOut);
    this.$element.on('keydown', this._onKeyDown);
  }
}

Palette.prototype.toggle = function () {
  if (this.$element.is(':visible')) {
    this._hide();
  } else {
    this._show();
  }
};

// Opens the palette (if needed) and moves keyboard focus to its first
// button. Used for keyboard-driven opening, where focus must land inside.
Palette.prototype.showAndFocus = function () {
  if (!this.$element.is(':visible')) {
    this._show();
  }
  this.$element.find('.dt-btn').first().trigger('focus');
};

Palette.prototype._show = function () {
  this._position();
  this.$element.show();

  var anchorButton = this.anchor && this.ui.getButton(this.anchor);
  if (anchorButton) {
    // The "palette is open" highlight is driven by aria-expanded in CSS,
    // not dt-active. dt-active means "this tool/value is selected" and is
    // owned by setActive(); reusing it here let _hide() wipe a still-valid
    // selection highlight when a palette closed after picking a tool.
    anchorButton.$element.attr('aria-expanded', 'true');
  }

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
  // If keyboard focus is inside the palette when it closes, return it to
  // the anchor button so the user isn't dropped back to the document body.
  var hadFocus = this.$element.find(document.activeElement).length > 0;
  this.$element.hide();
  this._clearWindowHandlers();
  var anchorButton = this.anchor && this.ui.getButton(this.anchor);
  if (anchorButton) {
    // Only clear the expanded state - dt-active (selected tool/value) is
    // owned by setActive() and must survive the palette closing.
    anchorButton.$element.attr('aria-expanded', 'false');
    if (hadFocus) {
      anchorButton.$element.trigger('focus');
    }
  }
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
    top:      p.top - mainP.top + this.topOffset,
    left:     p.left + anchorButton.$element.outerWidth() - mainP.left + this.leftOffset
  });
};

module.exports = Palette;
