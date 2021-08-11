var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

function ColorButton(options, ui, drawingTool, extraClasses) {
  var callback;
  if (options.type === 'stroke') {
    callback = function () {
      this.dt.setStrokeColor(options.color);
      this.dt.setSelectionStrokeColor(options.color);
    };
  } else {
    callback = function () {
      this.dt.setFillColor(options.color);
      this.dt.setSelectionFillColor(options.color);
    };
  }
  options.onClick = callback;
  options.onStateChange = function (state) {
    if (options.type === 'stroke') {
      if (state.stroke === options.color) {
        this.$element.addClass('dt-active');
      } else {
        this.$element.removeClass('dt-active');
      }
    } else {
      if (state.fill === options.color) {
        this.$element.addClass('dt-active');
      } else {
        this.$element.removeClass('dt-active');
      }
    }
  };
  BasicButton.call(this, options, ui, drawingTool, extraClasses);
}

inherit(ColorButton, BasicButton);

ColorButton.prototype.setBackground = function(color) {
  if (!color) {
    this.$element.addClass('dt-transparent');
    return;
  }
  this.$element.css('background', color);
};

module.exports = ColorButton;
