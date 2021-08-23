var $           = require('jquery');
var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

// The following require works in the stand-alone mode but fails when integrated in question-interactives
// as the file is not found during the build process.  Instead of copying the file its contents are put
// here as the code would break anyway if the contents were updated as the setColor method does a search
// and replace on the svg content.
// var strokeIconParts = require('../../assets/color-stroke-icon.svg').default.split(",");
var strokeIconSVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">',
  '    <g fill="none" fill-rule="evenodd">',
  '        <g>',
  '            <g>',
  '                <path d="M0 0H36V36H0z" transform="translate(-2131.000000, -942.000000) translate(2131.000000, 942.000000)"/>',
  '                <g>',
  '                    <path id="color_stroke_bar" fill="#545454" d="M0 18H26V23H0z" transform="translate(-2131.000000, -942.000000) translate(2131.000000, 942.000000) translate(5.000000, 7.000000)"/>',
  '                    <path id="color_stroke_outline" fill="#545454" d="M26 18v5H0v-5h26zm-.5.5H.5v4h25v-4z" transform="translate(-2131.000000, -942.000000) translate(2131.000000, 942.000000) translate(5.000000, 7.000000)"/>',
  '                    <path fill="#0481A0" d="M7.91 13.248h1.478v1.135l-1.987.353-.958-.972.347-2.016h1.12v1.5zM9.02 10.62c-.17-.17-.17-.446 0-.618l4.745-4.812c.17-.172.44-.172.61 0 .17.171.17.446 0 .618l-4.745 4.812c-.169.172-.44.172-.61 0zm4.933-7.502l-8.092 8.205-.652 3.798c-.09.513.35.956.856.869l3.744-.665L17.9 7.118c.145-.148.145-.385 0-.532l-3.42-3.47c-.148-.146-.382-.146-.527 0zm6.585 1.322l-1.42 1.441c-.146.145-.38.145-.524 0l-3.42-3.47c-.146-.147-.146-.385 0-.53l1.42-1.441c.576-.585 1.513-.585 2.091 0l1.853 1.878c.58.584.58 1.533 0 2.122z" transform="translate(-2131.000000, -942.000000) translate(2131.000000, 942.000000) translate(5.000000, 7.000000)"/>',
  '                </g>',
  '            </g>',
  '        </g>',
  '    </g>',
  '</svg>'
].join("");

function StrokeButton(options, ui, drawingTool, extraClasses) {
  BasicButton.call(this, options, ui, drawingTool, extraClasses);
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
  var newDataUri = ["data:image/svg+xml;base64", window.btoa(newSVG)].join(",");
  var img = this.$element.find("img");
  img.attr('src', newDataUri)
};

module.exports = StrokeButton;
