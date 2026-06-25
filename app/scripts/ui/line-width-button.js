var $           = require('jquery');
var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

function LineWidthButton(options, ui, drawingTool, extraClasses) {
  options.onClick = function () {
    this.dt.setStrokeWidth(options.width);
    this.dt.setSelectionStrokeWidth(options.width);
  };
  options.isToggle = true;
  options.onStateChange = function (state) {
    this.setActive(state.strokeWidth === options.width);
  };
  BasicButton.call(this, options, ui, drawingTool, extraClasses);
}

inherit(LineWidthButton, BasicButton);

module.exports = LineWidthButton;
