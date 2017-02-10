var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

function ColorButton(options, ui, drawingTool) {
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
  BasicButton.call(this, options, ui, drawingTool);

  this.setBackground(options.color);
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
