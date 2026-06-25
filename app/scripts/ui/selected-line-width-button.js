var $           = require('jquery');
var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

function SelectedLineWidthButton(options, ui, drawingTool, extraClasses) {
  BasicButton.call(this, options, ui, drawingTool, extraClasses);

  this.$width = $('<span>')
    .addClass('dt-selected-line-width')
    // Decorative state indicator: the button's aria-label already names it
    // ("Stroke width"), so hide this number from the a11y tree to avoid a
    // visible-label / accessible-name mismatch (WCAG 2.5.3).
    .attr('aria-hidden', 'true')
    .html(8)
    .appendTo(this.$element);
}

inherit(SelectedLineWidthButton, BasicButton);

SelectedLineWidthButton.prototype.setLineWidth = function(width) {
  this.$width.html(width);
};

module.exports = SelectedLineWidthButton;
