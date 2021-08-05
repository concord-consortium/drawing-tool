var $              = require('jquery');
var BasicButton    = require('./basic-button');
var Palette        = require('./palette');
var generateStamps = require('./generate-stamps');
var uiDefinition   = require('./ui-definition');

function UIManager(drawingTool) {
  this.drawingTool = drawingTool;

  this.$tools = $('<div>')
    .addClass('dt-tools')
    .prependTo(drawingTool.$element);

  this._palettes = {};
  this._buttons = {};
  this._paletteActiveButton = {};

  // Copy ui definition so custom modifications won't affect globally available object.
  var uiDef = $.extend(true, {}, uiDefinition);
  if (this.drawingTool.options.stamps) {
    generateStamps(uiDef, this.drawingTool.options.stamps);
  }

  // allow user to select buttons shown - the option is an array of button names
  const buttons = this.drawingTool.options.buttons || [];
  if (buttons.length > 0) {
    const customButtonDefs = [];
    buttons.forEach(button => {
      // check if we need to add buttons related to the requested buttons
      const addLineButtons = button === 'linesPalette';
      const addStampButtons = button === 'stamp';
      const addShapeButtons = button === 'shapesPalette';
      uiDef.buttons.forEach(buttonDef => {
        const addButtonDef = (buttonDef.name === button) ||
          (addLineButtons && buttonDef.palette === 'lines') ||
          (addShapeButtons && buttonDef.palette === 'shapes') ||
          (addStampButtons && ((buttonDef.palette === 'stampCategories') || (buttonDef.palette.indexOf('StampsPalette') >= 0)));
        if (addButtonDef) {
          customButtonDefs.push(buttonDef);
        }
      });

      // check for optional buttons (like annotations)
      uiDef.optionalButtons.forEach(buttonDef => {
        if (buttonDef.name === button) {
          customButtonDefs.push(buttonDef);
        }
      });
    });
    uiDef.buttons = customButtonDefs;
  }

  this._processUIDefinition(uiDef);

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

UIManager.prototype.getMainContainer = function () {
  return this.drawingTool.$element;
};

UIManager.prototype.getPaletteActiveButton = function (name) {
  return this._paletteActiveButton[name];
};

UIManager.prototype._createPalette = function (paletteOptions) {
  var palette = new Palette(paletteOptions, this);
  var paletteName = palette.name || getUniqueName();
  palette.$element.appendTo(this.$tools);
  this._palettes[paletteName] = palette;
};

UIManager.prototype._createButton = function (buttonOptions) {
  var BtnClass = buttonOptions.buttonClass || BasicButton;
  var button = new BtnClass(buttonOptions, this, this.drawingTool);
  var buttonName = button.name || getUniqueName();
  this._buttons[buttonName] = button;

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

var _idx = 0;
function getUniqueName() {
  return _idx++;
}

module.exports = UIManager;
