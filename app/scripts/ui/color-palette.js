var UI        = require('scripts/ui');
var BtnGroup  = require('scripts/ui/btn-group');
var ColorTool = require('scripts/tools/color-tool');
var inherit   = require('scripts/inherit');

/*
 * Color Palette extends button group and creates a series
 * of color tools of a specified type.
 * constructor parameters:
 *  - colorVals: array of color values
 *  - type: 'stroke' or 'fill'
 *  - drawTool
 */
function ColorPalette (colorVals, type, drawTool) {
  this.master = drawTool;

  var $btns = this._initBtns(colorVals, type);

  var name = type.length === undefined ? type + "ColorPalette" : "colorPalette";
  BtnGroup.call(this, name, $btns, true);
}

inherit(ColorPalette, BtnGroup);

/*
 * This helper function initalizes the color buttons.
 * It calls the ColorTool constructor, applies the proper styling,
 * and returns them as an array
 */
ColorPalette.prototype._initBtns = function (colorVals, type) {
  var i = 0;
  var $buttons = []
  if (type.length === undefined) { // single string for type
    for (i = 0; i < colorVals.length; i++) {
      $buttons.append(this.__initBtn(colorVals[i], type));
    }
  } else { // array of types
    if (colorVals.length !== type.length) {
      console.warn("The number of color values and types do not match!");
    }
    for (i = 0; i < colorVals.length; i++) {
      $buttons.append(this.__initBtn(colorVals[i], type[i]));
    }
  }
  return $buttons;
}

ColorPalette.prototype.__initBtn = function (color, type) {
  var ct = new ColorTool(color, type, color, this.master);
}
