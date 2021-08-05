var $           = require('jquery');
var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

function LineWidthButton(options, ui, drawingTool) {
  options.onClick = function () {
    this.dt.setStrokeWidth(options.width);
    this.dt.setSelectionStrokeWidth(options.width);
  };
  options.onStateChange = function (state) {
    if (state.strokeWidth === options.width) {
      this.$element.addClass('dt-active');
    } else {
      this.$element.removeClass('dt-active');
    }
  };
  BasicButton.call(this, options, ui, drawingTool);
}

inherit(LineWidthButton, BasicButton);

module.exports = LineWidthButton;
