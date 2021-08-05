var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

function SelectedLineWidthButton(options, ui, drawingTool) {
  BasicButton.call(this, options, ui, drawingTool);

  this.$width = $('<div>')
    .addClass('dt-selected-line-width')
    .html(8)
    .appendTo(this.$element);
}

inherit(SelectedLineWidthButton, BasicButton);

SelectedLineWidthButton.prototype.setLineWidth = function(width) {
  this.$width.html(width);
};

module.exports = SelectedLineWidthButton;
