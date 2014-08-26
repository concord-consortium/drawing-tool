var inherit     = require('scripts/inherit');
var BasicButton = require('scripts/ui/basic-button');

function StrokeButton(options, ui, drawingTool) {
  options.label = 'S';
  BasicButton.call(this, options, ui, drawingTool);

  $('<div>')
    .addClass('dt-btn-inner')
    .appendTo(this.$element);
}

inherit(StrokeButton, BasicButton);

StrokeButton.prototype.setColor = function(color) {
  this.$element.find('.dt-btn-inner').css('color', color);
};

module.exports = StrokeButton;
