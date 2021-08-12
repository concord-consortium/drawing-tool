var $           = require('jquery');
var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

var fillIconParts = require('../../assets/color-fill-icon.svg').default.split(",");
var dataUriPrefix = fillIconParts[0];
var fillIconSVG = window.atob(fillIconParts[1]);
function FillButton(options, ui, drawingTool) {
  BasicButton.call(this, options, ui, drawingTool);
}

inherit(FillButton, BasicButton);

FillButton.prototype.setColor = function(color) {
  // this is a bit of a brittle kludge but I was not able to get the contentDocument of the svg element to dynamically
  // set the fill in the DOM so this generates a new data uri based on the color
  color = color || 'none';
  var outlineColor = color == 'none' ? 'none' : (color == '#fff') || (color == '#ff0') ? '#545454' : color;
  var newSVG = fillIconSVG
    .replace('id="color_fill_bar" fill="#545454"', 'id="color_fill_bar" fill="' + color + '"')
    .replace('id="color_fill_outline" fill="#979797"', 'id="color_fill_bar" fill="' + outlineColor + '"')
  var newDataUri = [dataUriPrefix, window.btoa(newSVG)].join(",");
  var img = this.$element.find("img");
  img.attr('src', newDataUri)
};

module.exports = FillButton;
