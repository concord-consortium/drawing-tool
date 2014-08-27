require('scripts/jquery-longpress');

// Note that we use 'mousedown touchstart' everywhere. It's pretty important,
// as 'click' could interfere with palette auto-hide feature (as it hides on
// 'mousedown'). Also, it simplifies scenarios for touch devices,
// as 'mousedown' occurs in the same moment as 'touchstart'.

function BasicButton(options, ui, drawingTool) {
  this.ui = ui;
  this.dt = drawingTool;

  this.name = options.name;
  this.palette = options.palette;
  // Note that this will be called later by UI manager.
  this.onInit = options.onInit;

  this.$element = $('<div>')
    .addClass('dt-btn')
    .addClass(options.classes)
    .appendTo(ui.getPalette(options.palette).$element);

  this.$label = $('<span>')
    .text(options.label)
    .appendTo(this.$element);

  if (options.onClick) {
    this.$element.on('mousedown touchstart', function (e) {
      options.onClick.call(this, e, ui, drawingTool);
      e.preventDefault();
    }.bind(this));
  }

  if (options.onLongPress) {
    this.$element.longPress(function (e) {
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

  if (options.activatesTool) {
    this.$element.on('mousedown touchstart', function (e) {
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
        this.setLabel(ui.getButton(toolName).getLabel());
      } else {
        this.setActive(false);
        this.$element.removeClass('dt-active');
      }
    }.bind(this));
  }
}

BasicButton.prototype.setLabel = function (label) {
  this.$label.text(label);
};

BasicButton.prototype.getLabel = function () {
  return this.$label.text();
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
};

module.exports = BasicButton;
