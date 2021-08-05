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

  this.icon = options.icon && options.icon.default;

  this.$element = $('<div>')
    .addClass('dt-btn')
    .addClass(options.classes)
    .addClass(extraClasses)
    .attr('title', options.tooltip)
    .appendTo(ui.getPalette(options.palette).$element);

  if (this.icon) {
    this.$icon = $('<img>')
      .attr('src', this.icon)
      .addClass('icon')
      .appendTo(this.$element);
  } else {
    this.$label = $('<span>')
      .text(options.label)
      .appendTo(this.$element);
  }

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
      if (toolName === options.activatesTool) {
        this.$element.addClass('dt-active');
      } else {
        this.$element.removeClass('dt-active');
      }
    }.bind(this));
  }

  if (options.reflectsTools) {
    drawingTool.on('tool:changed', function (toolName) {
      if (options.reflectsTools.indexOf(toolName) !== -1) {
        this.setActive(true);
        this.setLabelOrIcon(ui.getButton(toolName));
      } else {
        this.setActive(false);
        this.$element.removeClass('dt-active');
      }
    }.bind(this));
  }
}

BasicButton.prototype.setLabelOrIcon = function (tool) {
  if (tool.icon && this.$icon) {
    this.$icon.attr('src', tool.icon);
  } else {
    this.$label.text(tool.label);
  }
};

BasicButton.prototype.getLabel = function () {
  // return this.$label.text();
};

BasicButton.prototype.click = function () {
  // #triggerHandler won't create a native event that bubbles (in contrast
  // to #trigger). Use it as otherwise it could interfere with some other
  // handlers listening to 'mousedown' on window (palette auto-hide feature).
  this.$element.triggerHandler('mousedown');
};

BasicButton.prototype.setActive = function (v) {
  if (v) {
    this.$element.addClass('dt-active');
  } else {
    this.$element.removeClass('dt-active');
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
