var $           = require('jquery');
var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

function SelectedLineWidthButton(options, ui, drawingTool, extraClasses) {
  BasicButton.call(this, options, ui, drawingTool, extraClasses);

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
