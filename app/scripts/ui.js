var BtnGroup             = require('scripts/ui/btn-group');

var UI_STRUCT = {
  // Main palette (vertical).
  main:   ['select', '-lines', '-shapes', 'free', 'text', 'trash'],
  // Sub-palettes (horizontal).
  shapes: ['rect', 'ellipse', 'square', 'circle'],
  lines:  ['line', 'arrow', 'doubleArrow']
};

var LABELS = {
  select: 's',
  line:   'L',
  arrow:  'A',
  doubleArrow: 'D',
  rect: 'R',
  ellipse: 'E',
  square: 'S',
  circle: 'C',
  free: 'F',
  text: 'T',
  trash: 'd'
};

function UI (master, selector, options) {
  this.master = master;
  this.options = options;

  this._initUI(selector);
  this._initTools();
}

// initialize tools, config palettes, set labels, and setup trash behavior
UI.prototype._initTools = function () {
  // tool palettes
  this._initToolUI(UI_STRUCT);
  this._initButtonUpdates(); // set up the listeners

  // TODO: rewrite/refactor this with classes and css like in the
  // [font-icons branch](https://github.com/concord-consortium/drawing-tool/tree/font-icons)

  // set the labels
  for (var k in LABELS) {
    this.setLabel(k, LABELS[k]);
  }

  // show/hide trash button when objects are selected/deselected
  var trash = this.$buttons.trash;
  trash.addClass('dt-locked');
  this.master.canvas.on("object:selected", function () {
    trash.removeClass('dt-locked');
  });
  this.master.canvas.on("selection:cleared", function () {
    trash.addClass('dt-locked');
  });

  this.master.chooseTool('select');
  this._updateMainPalette();
  this.palettes.main.$palette.show();
};

// Note: this function is bypassed in the _paletteButtonClicked function
UI.prototype.setLabel = function (toolId, label) {
  if (toolId.charAt(0) === '-') {
    var id = toolId.substring(1);
    this.$tools.find('.dt-target-'+id).find('span').text(label);
  } else {
    this.$tools.find("."+toolId).find('span').text(label);
  }
};

UI.prototype._initButtonUpdates = function () {
  // handler that updates UI when the internal tool state changes
  for (var toolId in this.master.tools) {
    this.master.tools[toolId].addStateListener(this.updateUI.bind(this));
  }

  // handler that updates internal state when the UI changes
  var self = this;
  this.$tools.find('.dt-btn').on('click touchstart', function (e) {
    self._uiClicked(this);
    e.preventDefault();
  });
};

// listens for a click in the tools area and delivers the action to
// the proper recipient (either `_paletteButtonClicked` or `_toolButtonClicked`)
UI.prototype._uiClicked = function (target) {
  if ($(target).data('dt-btn-type') === 'palette') {
    this._paletteButtonClicked($(target).data('dt-target-id'));
  } else {
    this._toolButtonClicked($(target).data('dt-target-id'));
  }
};

// switches active palette
UI.prototype._paletteButtonClicked = function (selector) {
  var oldPalette;
  var newPalette;

  newPalette = this.palettes[selector];
  // if the palette's current tool is already selected, don't select again!
  if (this.master.currentTool.selector !== this.palettes[selector].currentTool) {
    this.master.chooseTool(this.palettes[selector].currentTool);
  }

  for (var p in this.palettes) {
    this._hidePalette(p);
  }

  newPalette.show();
};

UI.prototype._updateMainPalette = function (selector) {
  var self = this;
  this.palettes.main.$palette.find('.dt-link').each(function () {
    var $btn = $(this);
    var paletteName = $btn.data('dt-target-id');
    var currToolId = self.palettes[paletteName].currentTool;
    $btn.find('span').text(self.$tools.find('.'+currToolId).find('span').text());
  });
};

// Handles all the tool palette clicks and tool changes
UI.prototype._toolButtonClicked = function (toolSelector) {
  var newTool = this.master.tools[toolSelector];
  if (!newTool) {
    console.warn('Unable to find tool with selector: '+toolSelector);
    return;
  }

  if (this.master.currentTool !== undefined &&
      this.master.currentTool.selector === toolSelector) {
    // Some tools may implement .activateAgain() method and
    // enable some special behavior.
    this.master.currentTool.activateAgain();
    return;
  }

  if (newTool.singleUse === true) {
    // special single use tools should not be set as the current tool
    newTool.use();
    return;
  }

  // activate and deactivate the new and old tools
  if (this.master.currentTool !== undefined) {
    this.master.currentTool.setActive(false);
  }

  this.master.currentTool = newTool;
  newTool.setActive(true);

  var paletteName = this.$buttons[newTool.selector].parent().data('dt-palette-id');
  var palette = this.palettes[paletteName];
  palette.currentTool = newTool.selector;
  this._updateMainPalette();

  // ??
  this.master.canvas.renderAll();
};

UI.prototype._hidePalette = function (name) {
  // Never hide main palette.
  if (name === 'main') return;
  var palette = this.palettes[name];
  if (!palette.$palette.is(':visible')) return;
  palette.hide();
};

// Updates the UI when the internal state changes
// object e = {source, active: true/false, locked: true/false}
UI.prototype.updateUI = function (e) {
  var $element = this.$buttons[e.source.selector];
  var $paletteAnchor = this.palettes[$element.parent().data('dt-palette-id')].$anchor || $('fake-element');

  if (e.active) {
    $element.addClass('dt-active');
    $paletteAnchor.addClass('dt-active');
  } else {
    $element.removeClass('dt-active');
    $paletteAnchor.removeClass('dt-active');
  }

  if (e.locked) {
    $element.addClass('dt-locked');
    $paletteAnchor.addClass('dt-locked');
  } else {
    $element.removeClass('dt-locked');
    $paletteAnchor.removeClass('dt-locked');
  }
};

// initializes the UI (divs and canvas size)
UI.prototype._initUI = function (selector) {
  this.$tools = $('<div class="dt-tools">')
    .prependTo(this.master.$element);
};

// initializes all the tools
UI.prototype._initToolUI = function (palettes) {
  this.$buttons = {};
  this.palettes = {};

  for (var palette in palettes) {
    var buttons = []; // array to be sent to the `BtnGroup` constructor
    var btnNames = palettes[palette];

    for (var i = 0; i < btnNames.length; i++) {
      var $btn;

      if (btnNames[i].charAt(0) === '-') {
        $btn = this._initBtn(btnNames[i], 'palette');
      } else if (btnNames[i].substring(0, 5) === 'color') {
        $btn = this._initBtn(btnNames[i], 'color');
      } else { $btn = this._initBtn(btnNames[i]); }

      buttons[i] = $btn;
      this.$buttons[btnNames[i]] = $btn;
    }
    this.palettes[palette] = new BtnGroup(palette, buttons, this.$buttons['-' + palette]);
    this.palettes[palette].$palette.appendTo(this.$tools);
  }
};

// initializes each button
UI.prototype._initBtn = function (toolId, type) {
  var $element = $('<div class="dt-btn">');

  if (!type) { // normal button
    $element.addClass(toolId)
      .data('dt-btn-type', 'tool')
      .data('dt-target-id', toolId);
  } else if (type === 'palette') { // button that links to a subpalette
    $element.data('dt-btn-type', 'palette')
      .data('dt-target-id', toolId.substring(1))
      .addClass('dt-expand')
      .addClass('dt-link');
  } else if (type === 'color') {
    $element.data('dt-btn-type', "tool")
      .data('dt-target-id', toolId)
      .addClass(toolId)
      .addClass('dt-target-'+toolId)
      .addClass('dt-btn-color')
      .css('background-color', this.master.tools[toolId].color);
  }
  $('<span>') // for the label
    .appendTo($element);
  return $element;
};

module.exports = UI;
