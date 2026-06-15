var $ = require('jquery');
require('../jquery-longpress');

// Note that we use 'mousedown touchstart' everywhere. It's pretty important,
// as 'click' could interfere with palette auto-hide feature (as it hides on
// 'mousedown'). Also, it simplifies scenarios for touch devices,
// as 'mousedown' occurs in the same moment as 'touchstart'.

function BasicButton(options, ui, drawingTool, extraClasses) {
  this.ui = ui;
  this.dt = drawingTool;

  this.name = options.name;
  this.palette = options.palette;
  // Note that this will be called later by UI manager.
  this.onInit = options.onInit;

  this._locked = false;

  // Buttons that represent an on/off state (tool choice, color, width,
  // font size, stamp) expose it via aria-pressed. Plain action buttons
  // (undo, redo, send to back...) must not have aria-pressed at all.
  this._isToggle = !!(options.activatesTool || options.reflectsTools || options.isToggle);

  this.icon = options.icon && options.icon.default;

  this.$element = $('<button type="button">')
    .addClass('dt-btn')
    .addClass(options.classes)
    .addClass(extraClasses)
    .attr('title', options.tooltip)
    .attr('aria-label', options.ariaLabel || options.tooltip)
    .appendTo(ui.getPalette(options.palette).$element);

  if (this._isToggle) {
    this.$element.attr('aria-pressed', 'false');
  }

  if (this.icon) {
    this.$icon = $('<img>')
      .attr('src', this.icon)
      // Decorative - the button itself provides the accessible name.
      .attr('alt', '')
      .addClass('icon')
      .appendTo(this.$element);
  } else {
    this.$label = $('<span>')
      .text(options.label)
      .appendTo(this.$element);
  }

  // Keyboard activation. This library deliberately acts on 'mousedown
  // touchstart' rather than 'click' (see note at the top of this file), so
  // a native button's Enter/Space click events would be ignored. Trigger
  // the 'mousedown' handlers directly instead. preventDefault() stops the
  // browser from also synthesizing a 'click' (and stops Space scrolling).
  this.$element.on('keydown', function (e) {
    if (e.keyCode !== 13 /* Enter */ && e.keyCode !== 32 /* Space */) {
      return;
    }
    e.preventDefault();
    if (this._locked) {
      return;
    }
    this.click();
    this._hidePaletteAfterKeyboardActivation();
  }.bind(this));

  if (options.onClick) {
    this.$element.on('mousedown touchstart', function (e) {
      if (this._locked) return;
      options.onClick.call(this, e, ui, drawingTool);
      e.preventDefault();
    }.bind(this));
  }

  if (options.onLongPress) {
    this.$element.longPress(function (e) {
      if (this._locked) return;
      options.onLongPress.call(this, e, ui, drawingTool);
      e.preventDefault();
    }.bind(this));
  }

  if (options.onStateChange) {
    drawingTool.on('state:changed', function (state) {
      options.onStateChange.call(this, state);
    }.bind(this));
  }

  if (options.onToolChange) {
    drawingTool.on('tool:changed', function (state) {
      options.onToolChange.call(this, state);
    }.bind(this));
  }

  if (options.onStampChange) {
    drawingTool.on('stamp:changed', function (state) {
      options.onStampChange.call(this, state);
    }.bind(this));
  }

  if (options.activatesTool) {
    this.$element.on('mousedown touchstart', function (e) {
      if (this._locked) return;
      drawingTool.chooseTool(options.activatesTool);
      e.preventDefault();
    }.bind(this));

    drawingTool.on('tool:changed', function (toolName) {
      this.setActive(toolName === options.activatesTool);
    }.bind(this));
  }

  if (options.reflectsTools) {
    drawingTool.on('tool:changed', function (toolName) {
      if (options.reflectsTools.indexOf(toolName) !== -1) {
        this.setActive(true);
        this.setIcon(ui.getButton(toolName));
      } else {
        this.setActive(false);
      }
    }.bind(this));
  }
}

BasicButton.prototype.setIcon = function (tool) {
  if (tool.icon && this.$icon) {
    this.$icon.attr('src', tool.icon);
  } else {
    this.$label.text(tool.label);
  }
};

BasicButton.prototype.click = function () {
  // #triggerHandler won't create a native event that bubbles (in contrast
  // to #trigger). Use it as otherwise it could interfere with some other
  // handlers listening to 'mousedown' on window (palette auto-hide feature).
  this.$element.triggerHandler('mousedown');
};

// Popup palettes auto-hide on window 'mousedown', which never fires for
// keyboard activation, so hide the button's containing palette explicitly.
// Mirrors the _closeOnClick logic in palette.js: permanent palettes and
// palettes with hideOnClick=false (stamp categories) stay open.
BasicButton.prototype._hidePaletteAfterKeyboardActivation = function () {
  var palette = this.ui.getPalette(this.palette);
  if (palette && !palette.permanent && palette.hideOnClick && palette.$element.is(':visible')) {
    palette._hide();
  }
};

BasicButton.prototype.setActive = function (v) {
  if (v) {
    this.$element.addClass('dt-active');
  } else {
    this.$element.removeClass('dt-active');
  }
  if (this._isToggle) {
    this.$element.attr('aria-pressed', v ? 'true' : 'false');
  }
};

BasicButton.prototype.setLocked = function (v) {
  if (v) {
    this.$element.addClass('dt-locked');
  } else {
    this.$element.removeClass('dt-locked');
  }
  this._locked = v;
};

module.exports = BasicButton;
