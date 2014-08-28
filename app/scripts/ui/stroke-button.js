var inherit     = require('scripts/inherit');
var BasicButton = require('scripts/ui/basic-button');

function StrokeButton(options, ui, drawingTool) {
  BasicButton.call(this, options, ui, drawingTool);

  this.$element
    .addClass('dt-stroke-color');
  var $color = $('<div>')
    .addClass('dt-color')
    .appendTo(this.$element);
  $('<div>')
    .addClass('dt-inner1')
    .appendTo($color);
  $('<div>')
    .addClass('dt-inner2')
    .appendTo($color);
}

inherit(StrokeButton, BasicButton);

StrokeButton.prototype.setColor = function(color) {
  if (!color) {
    this.$element.find('.dt-color').addClass('dt-no-color');
    // Light gray looks better than white / transparent.
    color = '#ddd';
  } else {
    this.$element.find('.dt-color').removeClass('dt-no-color');
  }
  this.$element.find('.dt-color').css('background', color);
};

module.exports = StrokeButton;
