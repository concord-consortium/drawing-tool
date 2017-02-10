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

  $('<div>')
    .addClass('dt-line-width-icon')
    .appendTo(this.$element);
  this.setLineWidth(options.width);
}

inherit(LineWidthButton, BasicButton);

LineWidthButton.prototype.setLineWidth = function(width) {
  if (width === 0) {
    this.$element.find('.dt-line-width-icon').addClass('dt-no-stroke');
    return;
  }
  this.$element.find('.dt-line-width-icon').css('width', width);
};

module.exports = LineWidthButton;
