var $           = require('jquery');
var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

// The following require works in the stand-alone mode but fails when integrated in question-interactives
// as the file is not found during the build process.  Instead of copying the file its contents are put
// here as the code would break anyway if the contents were updated as the setColor method does a search
// and replace on the svg content.
// var fillIconParts = require('../../assets/color-fill-icon.svg').default.split(",");
var fillIconSVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">',
  '    <defs>',
  '        <filter id="5d93qer36a" color-interpolation-filters="auto">',
  '            <feColorMatrix in="SourceGraphic" values="0 0 0 0 0.015686 0 0 0 0 0.505882 0 0 0 0 0.627451 0 0 0 1.000000 0"/>',
  '        </filter>',
  '    </defs>',
  '    <g fill="none" fill-rule="evenodd">',
  '        <g>',
  '            <g>',
  '                <path d="M0 0H36V36H0z" transform="translate(-2177.000000, -942.000000) translate(2177.000000, 942.000000)"/>',
  '                <g>',
  '                    <path fill-rule="nonzero" d="M0 17.999H26V22.999H0z" transform="translate(-2177.000000, -942.000000) translate(2177.000000, 942.000000) translate(5.000000, 7.000575)"/>',
  '                    <path id="color_fill_bar" fill="#545454" d="M0 18H26V23H0z" transform="translate(-2131.000000, -942.000000) translate(2131.000000, 942.000000) translate(5.000000, 7.000000)"/>',
  '                    <path id="color_fill_outline" fill="#979797" d="M26 18v5H0v-5h26zm-.5.5H.5v4h25v-4z" transform="translate(-2177.000000, -942.000000) translate(2177.000000, 942.000000) translate(5.000000, 7.000575)"/>',
  '                    <g filter="url(#5d93qer36a)" transform="translate(-2177.000000, -942.000000) translate(2177.000000, 942.000000) translate(5.000000, 7.000575)">',
  '                        <g>',
  '                            <path fill="#0481A0" d="M7.01 4.07l4.427 4.427H2.583L7.01 4.07zm6.717 4.243L5.67.257c-.34-.342-.893-.342-1.235-.001-.344.34-.344.896-.002 1.238l1.34 1.34-5.48 5.479c-.39.39-.39 1.024 0 1.414l6.01 6.01c.196.195.452.293.709.293.255 0 .511-.098.707-.293l6.01-6.01c.39-.39.39-1.023 0-1.414zM17.98 14.23c0 1.035-.839 1.875-1.874 1.875-1.035 0-1.874-.84-1.874-1.874 0-1.521 1.891-3.21 1.891-3.21s1.857 1.666 1.857 3.21" transform="translate(4.000300, 0.000000)"/>',
  '                        </g>',
  '                    </g>',
  '                </g>',
  '            </g>',
  '        </g>',
  '    </g>',
  '</svg>'
].join("");

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
  var newDataUri = ["data:image/svg+xml;base64", window.btoa(newSVG)].join(",");
  var img = this.$element.find("img");
  img.attr('src', newDataUri)
};

module.exports = FillButton;
