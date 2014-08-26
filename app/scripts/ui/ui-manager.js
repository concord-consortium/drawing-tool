var BasicButton  = require('scripts/ui/basic-button');
var Palette      = require('scripts/ui/palette');
var uiDefinition = require('scripts/ui/ui-definition');

function UIManager(drawingTool) {
  this.drawingTool = drawingTool;

  this.$tools = $('<div>')
    .addClass('dt-tools')
    .prependTo(drawingTool.$element);

  this._palettes = {};
  this._buttons = {};
  this._firstPaletteButton = {};
  this._processUIDefinition(uiDefinition);

  for (var name in this._buttons) {
    var btn = this._buttons[name];
    if (btn.onInit) {
      btn.onInit.call(btn, this, drawingTool);
    }
  }
}

UIManager.prototype._processUIDefinition = function (uiDef) {
  this.$tools.empty();
  uiDef.palettes.forEach(this._createPalette.bind(this));
  uiDef.buttons.forEach(this._createButton.bind(this));
};

UIManager.prototype.getButton = function (name) {
  return this._buttons[name];
};

UIManager.prototype.getPalette = function (name) {
  return this._palettes[name];
};

UIManager.prototype.togglePalette = function (name) {
  this._palettes[name].toggle();
};

UIManager.prototype.getFirstPaletteButton = function (name) {
  return this._firstPaletteButton[name];
};

UIManager.prototype._createPalette = function (paletteOptions) {
  var palette = new Palette(paletteOptions, this);
  palette.$element.appendTo(this.$tools);
  this._palettes[palette.name] = palette;
};

UIManager.prototype._createButton = function (buttonOptions) {
  var BtnClass = buttonOptions.buttonClass || BasicButton;
  var button = new BtnClass(buttonOptions, this, this.drawingTool);
  this._buttons[button.name] = button;

  if (!this._firstPaletteButton[button.palette]) {
    // This is the first button that is added to given palette.
    // Used by #getFirstPaletteButton.
    this._firstPaletteButton[button.palette] = button;
  }
};

module.exports = UIManager;
