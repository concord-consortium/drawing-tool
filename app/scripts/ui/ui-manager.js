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
  this._paletteActiveButton = {};
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

UIManager.prototype.getPaletteActiveButton = function (name) {
  return this._paletteActiveButton[name];
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

  this._setupPaletteActiveButton(button);
};

UIManager.prototype._setupPaletteActiveButton = function (button) {
  if (!this._paletteActiveButton[button.palette]) {
    // This will first button added to palette as "active" palette button.
    this._paletteActiveButton[button.palette] = button;
  }
  button.$element.on('mousedown touchstart', function () {
    // This will update "active" palette button during every click / touch.
    this._paletteActiveButton[button.palette] = button;
  }.bind(this));
};

module.exports = UIManager;
