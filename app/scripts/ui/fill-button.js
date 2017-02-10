var $           = require('jquery');
var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

function FillButton(options, ui, drawingTool) {
  BasicButton.call(this, options, ui, drawingTool);

  this.$element
    .addClass('dt-fill-color');
  $('<div>')
    .addClass('dt-color')
    .appendTo(this.$element);
}

inherit(FillButton, BasicButton);

FillButton.prototype.setColor = function(color) {
  if (!color) {
    this.$element.find('.dt-color').addClass('dt-no-color');
    // Light gray looks better than white / transparent.
    color = '#ddd';
  } else {
    this.$element.find('.dt-color').removeClass('dt-no-color');
  }
  this.$element.find('.dt-color').css('background', color);
};

module.exports = FillButton;
