require('scripts/jquery-longpress');

function Button(options, ui, drawingTool) {
  this.name = options.name;
  this.palette = options.palette;
  // Note that this will be called later by UI manager.
  this.onInit = options.onInit;

  this.$element = $('<div>')
    .addClass('dt-btn')
    .addClass(options.class)
    .appendTo(ui.getPalette(options.palette).$element);

  this.$label = $('<span>')
    .text(options.label)
    .appendTo(this.$element);

  if (options.onClick) {
    this.$element.on('mousedown touchstart', function (e) {
      options.onClick.call(this, e, ui);
    }.bind(this));
  }

  if (options.onLongPress) {
    this.$element.longPress(function (e) {
      options.onLongPress.call(this, e, ui);
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

Button.prototype.setLabel = function (label) {
  this.$label.text(label);
};

Button.prototype.getLabel = function () {
  return this.$label.text();
};

Button.prototype.click = function () {
  this.$element.mousedown();
};

Button.prototype.setActive = function (v) {
  if (v) {
    this.$element.addClass('dt-active');
  } else {
    this.$element.removeClass('dt-active');
  }
};

Button.prototype.setLocked = function (v) {
  if (v) {
    this.$element.addClass('dt-locked');
  } else {
    this.$element.removeClass('dt-locked');
  }
};

module.exports = Button;
