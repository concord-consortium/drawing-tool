var inherit     = require('scripts/inherit');
var BasicButton = require('scripts/ui/basic-button');

function FillButton(options, ui, drawingTool) {
  options.label = 'S';
  BasicButton.call(this, options, ui, drawingTool);

  $('<div>')
    .addClass('dt-color')
    .appendTo(this.$element);
}

inherit(FillButton, BasicButton);

FillButton.prototype.setColor = function(color) {
  if (!color) {
    this.$element.find('.dt-color').addClass('dt-no-color');
  } else {
    this.$element.find('.dt-color').removeClass('dt-no-color');
  }
  this.$element.find('.dt-color').css('background', color);
};

module.exports = FillButton;
