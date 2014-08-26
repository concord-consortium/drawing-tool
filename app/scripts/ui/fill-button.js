var inherit     = require('scripts/inherit');
var BasicButton = require('scripts/ui/basic-button');

function FillButton(options, ui, drawingTool) {
  options.label = 'S';
  BasicButton.call(this, options, ui, drawingTool);

  $('<div>')
    .addClass('dt-btn-inner')
    .appendTo(this.$element);
}

inherit(FillButton, BasicButton);

FillButton.prototype.setColor = function(color) {
  this.$element.find('.dt-btn-inner').css({
    color: color,
    background: color
  });
};

module.exports = FillButton;
