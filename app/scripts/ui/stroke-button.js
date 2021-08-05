var $           = require('jquery');
var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

var strokeIconParts = require('../../assets/color-stroke-icon.svg').default.split(",");
var dataUriPrefix = strokeIconParts[0];
var strokeIconSVG = window.atob(strokeIconParts[1]);

function StrokeButton(options, ui, drawingTool) {
  BasicButton.call(this, options, ui, drawingTool);
}

inherit(StrokeButton, BasicButton);

StrokeButton.prototype.setColor = function(color) {
  // this is a bit of a brittle kludge but I was not able to get the contentDocument of the svg element to dynamically
  // set the fill in the DOM so this generates a new data uri based on the color
  color = color || 'none';
  var outlineColor = color == 'none' ? 'none' : (color == '#fff') || (color == '#ff0') ? '#545454' : color;
  var newSVG = strokeIconSVG
    .replace('id="color_stroke_bar" fill="#545454"', 'id="color_stroke_bar" fill="' + color + '"')
    .replace('id="color_stroke_outline" fill="#545454"', 'id="color_stroke_bar" fill="' + outlineColor + '"')
  var newDataUri = [dataUriPrefix, window.btoa(newSVG)].join(",");
  var img = this.$element.find("img");
  img.attr('src', newDataUri)
};

module.exports = StrokeButton;
