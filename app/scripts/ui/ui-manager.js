var $              = require('jquery');
var BasicButton    = require('./basic-button');
var Palette        = require('./palette');
var generateStamps = require('./generate-stamps');
var uiDefinition   = require('./ui-definition');

function UIManager(drawingTool) {
  this.drawingTool = drawingTool;

  // role="toolbar" + roving tabindex (set up in Task 6): the whole toolbar
  // is one Tab stop and Arrow keys move between buttons. The toolbar is a
  // vertical column, so aria-orientation is vertical.
  this.$tools = $('<div>')
    .addClass('dt-tools')
    .attr('role', 'toolbar')
    .attr('aria-orientation', 'vertical')
    .attr('aria-label', 'Drawing tools')
    .prependTo(drawingTool.$element);

  // Toolbar should be the height of the canvas.
  this.$tools.css("height", this.drawingTool.options.height);

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
      const addFontSizeButtons = button === 'text';
      const addStrokeColorButtons = button === 'strokeColorPalette';
      const addStrokeWidthButtons = button === 'strokeWidthPalette';
      const addFillColorButtons = button === 'fillColorPalette';
      uiDef.buttons.forEach(buttonDef => {
        const addButtonDef = (buttonDef.name === button) ||
          (addLineButtons && buttonDef.palette === 'lines') ||
          (addShapeButtons && buttonDef.palette === 'shapes') ||
          (addFontSizeButtons && buttonDef.palette === 'fontSizes') ||
          (addStrokeColorButtons && buttonDef.palette === 'strokeColors') ||
          (addStrokeWidthButtons && buttonDef.palette === 'strokeWidths') ||
          (addFillColorButtons && buttonDef.palette === 'fillColors') ||
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

  const separatorsAfter = this.drawingTool.options.separatorsAfter || [];
  if (separatorsAfter.length > 0) {
    uiDef.buttons.forEach(button => {
      if (separatorsAfter.indexOf(button.name) !== -1) {
        button.separatorAfter = true;
      }
    });
  }

  this._processUIDefinition(uiDef);

  for (var name in this._buttons) {
    var btn = this._buttons[name];
    if (btn.onInit) {
      btn.onInit.call(btn, this, drawingTool);
    }
  }

  for (var paletteName in this._palettes) {
    this._setupPaletteAnchor(this._palettes[paletteName]);
  }

  this._setupKeyboardNavigation();
}

UIManager.prototype._processUIDefinition = function (uiDef) {
  var firstMainButton = -1;
  var lastMainButton = -1;
  for (var i = 0; i < uiDef.buttons.length; i++) {
    if (uiDef.buttons[i].palette === "main") {
      if (firstMainButton === -1) {
        firstMainButton = i;
      }
      lastMainButton = i;
    }
  }

  this.$tools.empty();
  uiDef.palettes.forEach(this._createPalette.bind(this));
  uiDef.buttons.forEach((button, index) => {
    this._createButton(button, index, firstMainButton, lastMainButton);
  });
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

// Hide every open popup palette (permanent palettes - the main toolbar -
// stay put). _hide only restores focus when focus was inside the palette,
// so calling this while focus is on a main button does not steal it.
UIManager.prototype._closeOpenPalettes = function () {
  for (var name in this._palettes) {
    var palette = this._palettes[name];
    if (!palette.permanent && palette.$element.is(':visible')) {
      palette._hide();
    }
  }
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

UIManager.prototype._createButton = function (buttonOptions, index, firstMainButton, lastMainButton) {
  var extraClasses = [];
  if (index === firstMainButton) {
    extraClasses.push("dt-first");
  } else if (index === lastMainButton) {
    extraClasses.push("dt-last");
  }
  if (buttonOptions.separatorAfter) {
    extraClasses.push("dt-separator-after");
  }
  var BtnClass = buttonOptions.buttonClass || BasicButton;
  var button = new BtnClass(buttonOptions, this, this.drawingTool, extraClasses.join(" "));
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

// Expose the relation between an expandable button and the palette it
// opens to assistive technology, and let keyboard users open it
// (mouse/touch users use click-and-hold or click).
UIManager.prototype._setupPaletteAnchor = function (palette) {
  var anchorButton = palette.anchor && this.getButton(palette.anchor);
  if (!anchorButton) {
    return;
  }
  anchorButton.$element
    .attr('aria-haspopup', 'true')
    .attr('aria-controls', palette.id)
    .attr('aria-expanded', 'false');
  anchorButton.$element.on('keydown', function (e) {
    // ArrowRight opens the palette (palettes fly out to the right of their
    // anchor). ArrowUp/ArrowDown are reserved for moving between toolbar
    // buttons (roving tabindex), so they must NOT open the palette.
    if (e.keyCode === 39 /* ArrowRight */) {
      e.preventDefault();
      palette.showAndFocus();
      return;
    }
    // The button's own Enter/Space handler runs first (bound earlier). If
    // it just opened this palette (stroke color, fill color, stroke width
    // toggle their palette on click), move focus into it.
    if ((e.keyCode === 13 /* Enter */ || e.keyCode === 32 /* Space */) &&
        palette.$element.is(':visible')) {
      palette.showAndFocus();
    }
  });
};

// Make the toolbar a single Tab stop with a roving tabindex (ARIA Toolbar
// pattern). Only one main-toolbar button is in the page tab order at a
// time; Arrow / Home / End keys move focus AND the tab stop between
// buttons. Popup-palette buttons are never their own Tab stop - they are
// reached by opening their palette (ArrowRight / Enter on the anchor).
UIManager.prototype._setupKeyboardNavigation = function () {
  // Every toolbar/palette button: programmatically focusable, but not a
  // Tab stop.
  this.$tools.find('.dt-btn').attr('tabindex', '-1');

  var mainPalette = this.getPalette('main');
  if (!mainPalette) {
    return;
  }
  var $main = mainPalette.$element.find('.dt-btn');
  if (!$main.length) {
    return;
  }
  // The one button that IS the toolbar's tab stop.
  $main.eq(0).attr('tabindex', '0');

  var self = this;
  function focusAt(i) {
    // Roving to another main button means we are leaving any open popup
    // palette behind. Mouse/long-press opening leaves focus on the main
    // anchor (focus never enters the palette), so without this an Arrow
    // key would rove away while the palette stayed open - letting several
    // palettes be visible at once. Close them as we move.
    self._closeOpenPalettes();
    var n = $main.length;
    var idx = (i % n + n) % n;  // wrap around both ends
    $main.attr('tabindex', '-1');
    $main.eq(idx).attr('tabindex', '0').trigger('focus');
  }

  $main.on('keydown', function (e) {
    var idx = $main.index(this);
    switch (e.keyCode) {
      case 38: /* ArrowUp   */ e.preventDefault(); focusAt(idx - 1); break;
      case 40: /* ArrowDown */ e.preventDefault(); focusAt(idx + 1); break;
      case 36: /* Home      */ e.preventDefault(); focusAt(0); break;
      case 35: /* End       */ e.preventDefault(); focusAt($main.length - 1); break;
    }
  });

  // When a main button receives focus by any route (mouse click, or focus
  // returning from a closed palette), make it the sole tab stop so a later
  // Shift+Tab / Tab leaves from the right place.
  $main.on('focus', function () {
    $main.attr('tabindex', '-1');
    $(this).attr('tabindex', '0');
  });
};

var _idx = 0;
function getUniqueName() {
  return _idx++;
}

module.exports = UIManager;
