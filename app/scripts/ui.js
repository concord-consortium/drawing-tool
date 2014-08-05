var Tool           = require('scripts/tool');
var SelectionTool  = require('scripts/tools/select-tool');
var LineTool       = require('scripts/tools/shape-tools/line-tool');
var BasicShapeTool = require('scripts/tools/shape-tools/basic-shape-tool');
var FreeDrawTool   = require('scripts/tools/shape-tools/free-draw');
var DeleteTool     = require('scripts/tools/delete-tool');
var ColorTool      = require('scripts/tools/color-tool');
var BtnGroup       = require('scripts/ui/btn-group');

function UI (master, selector, options) {
  this.master = master;
  this.options = options;

  this._initUI(selector);
}

// initialize tools, config palettes, set labels, and setup trash behavior
UI.prototype.initTools = function (p) {

  // Initialize all the tools, they add themselves to the master.tools list
  var selectionTool = new SelectionTool("Selection Tool", "select", this.master);
  var lineTool = new LineTool("Line Tool", "line", this.master);
  var arrowTool = new LineTool("Arrow Tool", "arrow", this.master, "arrow");
  var doubleArrowTool = new LineTool("Double Arrow Tool", "doubleArrow", this.master, "arrow", {doubleArrowhead: true});
  var rectangleTool = new BasicShapeTool("Rectangle Tool", "rect", this.master, "rect");
  var ellipseTool = new BasicShapeTool("Ellipse Tool", "ellipse", this.master, "ellipse");
  var squareTool = new BasicShapeTool("Square Tool", "square", this.master, "square");
  var circleTool = new BasicShapeTool("Circle Tool", "circle", this.master, "circle");
  var freeDrawTool = new FreeDrawTool("Free Draw Tool", "free", this.master);
  var deleteTool = new DeleteTool("Delete Tool", "trash", this.master);

  new ColorTool('color1', 'stroke', 'black', this.master);
  new ColorTool('color2', 'stroke', 'white', this.master);
  new ColorTool('color3', 'stroke', 'red', this.master);
  new ColorTool('color4', 'stroke', 'blue', this.master);
  new ColorTool('color5', 'stroke', 'purple', this.master);
  new ColorTool('color6', 'stroke', 'green', this.master);
  new ColorTool('color7', 'stroke', 'yellow', this.master);
  new ColorTool('color8', 'stroke', 'orange', this.master);

  // tool palettes
  // TODO: document this portion
  var palettes = p || {
    shapes: ['-select', 'rect', 'ellipse', 'square', 'circle'],
    lines: ['-select', 'line', 'arrow', 'doubleArrow'],
    main: ['select', '-lines', '-shapes', 'free', 'trash'],
    perm_color_stroke: ['color1', 'color2', 'color3', 'color4', 'color5', 'color6', 'color7', 'color8']
  };
  this._initToolUI(palettes); // initialize the palettes and buttons
  this._initButtonUpdates(); // set up the listeners

  // TODO: rewrite/refactor this with classes and css
  // set the labels
  this.setLabel(selectionTool.selector,   "s");
  this.setLabel(lineTool.selector,        "L");
  this.setLabel(arrowTool.selector,       "A");
  this.setLabel(doubleArrowTool.selector, "D");
  this.setLabel(rectangleTool.selector,   "R");
  this.setLabel(ellipseTool.selector,     "E");
  this.setLabel(squareTool.selector,      "S");
  this.setLabel(circleTool.selector,      "C");
  this.setLabel(freeDrawTool.selector,    "F");
  this.setLabel(deleteTool.selector,      "d");
  this.setLabel("-shapes", "Sh"); // immediately replaced by the currently active shape tool (rect)
  this.setLabel("-lines",  "Li"); // immediately replaced by the currently active line tool (line)
  this.setLabel("-select", "s");

  // show/hide trash button when objects are selected/deselected
  var trash = this.$buttons.trash;
  trash.addClass('dt-locked');
  this.master.canvas.on("object:selected", function () { trash.removeClass('dt-locked'); });
  this.master.canvas.on("selection:cleared", function () { trash.addClass('dt-locked'); });

  // start on the select tool and show the main menu
  // this.palettes.main.$palette.show();
  this.master.chooseTool('select');
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
    this.master.tools[toolId].addStateListener(this.updateUI);
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

  for (var p in this.palettes) {
    if (p === selector) {
      newPalette = this.palettes[p];
      // if the palette's current tool is already selected, don't select again!
      if (this.master.currentTool.selector !== this.palettes[p].currentTool) {
        this.master.chooseTool(this.palettes[p].currentTool);
      }
    } else if (this.palettes[p].$palette.is(':visible') && !this.palettes[p].permanent){
        oldPalette = this.palettes[p];
    }
  }

  if (oldPalette && newPalette) {
    oldPalette.hide(function () { newPalette.show(); });
  } else if (newPalette) { newPalette.show(); }

  // refreshing any palette buttons that need new/updated
  // current tool icons
  var links = this.palettes[selector].$palette.find('.dt-link');
  for (var i = 0; i < links.length; i++) {
    if ($(links[i]).data('dt-btn-type') === 'palette') {
      var paletteName = $(links[i]).data('dt-target-id');
      var currToolId = this.palettes[paletteName].currentTool;
      $(links[i]).find('span').text(this.$tools.find('.'+currToolId).find('span').text());
    }
  }
};

// Handles all the tool palette clicks and tool changes
UI.prototype._toolButtonClicked = function (toolSelector) {
  var newTool = this.master.tools[toolSelector];
  var $newPalette = this.$buttons[newTool.selector].parent();

  if (this.master.currentTool !== undefined &&
    this.master.currentTool.selector === toolSelector) {
    // Some tools may implement .activateAgain() method and
    // enable some special behavior.
    this.master.currentTool.activateAgain();
    return;
  }

  // search for tool
  if (newTool === undefined){
    console.warn("Warning! Could not find tool with selector \"" + toolSelector +
      "\"\nExiting tool chooser.");
    return;
  } else if (newTool.singleUse === true) {
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

  this.palettes[$newPalette.data('dt-palette-id')].currentTool = newTool.selector;

  // if the palette that the tool belongs to is not visible
  // then make it visible
  if (!$newPalette.is(':visible')) {
    this._paletteButtonClicked($newPalette.data('dt-palette-id'));
  }

  this.master.canvas.renderAll();
};

// Updates the UI when the internal state changes
// object e = {source, active: true/false, locked: true/false}
UI.prototype.updateUI = function (e) {
  var $element = this.$buttons[e.source.selector];
  if (e.active) { $element.addClass('dt-active'); }
  else { $element.removeClass('dt-active'); }

  if (e.locked) { $element.addClass('dt-locked'); }
  else { $element.removeClass('dt-locked'); }
};

// initializes the UI (divs and canvas size)
UI.prototype._initUI = function (selector) {
  $(selector).empty();
  this.$element = $('<div class="dt-container">').appendTo(selector);
  this.$tools = $('<div class="dt-tools">')
    .appendTo(this.$element);
  var $canvasContainer = $('<div class="dt-canvas-container">')
    .attr('tabindex', 0) // makes the canvas focusable for keyboard events
    .appendTo(this.$element);
  this.$canvas = $('<canvas>')
    .attr('width', this.options.width + 'px')
    .attr('height', this.options.height + 'px')
    .appendTo($canvasContainer);
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

        if (btnNames[i].substring(1) in palettes) {
          $btn = this._initBtn(btnNames[i], 'palette');
        } else {
          $btn = this._initBtn(btnNames[i], 'toolLink');
        }

      } else if (btnNames[i].substring(0, 5) === 'color') {
        $btn = this._initBtn(btnNames[i], 'color');
      } else { $btn = this._initBtn(btnNames[i]); }

      buttons[i] = $btn;
      this.$buttons[btnNames[i]] = $btn;
    }
    // if the palette name begins with '_' then it is a permanent palette
    this.palettes[palette] = new BtnGroup(palette, buttons, palette.substring(0, 5) === 'perm_');
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
      .addClass('dt-target-'+toolId.substring(1))
      .addClass('dt-link');
  } else if (type === 'toolLink') { // link to tool (ex: selector)
    $element.data('dt-btn-type', 'toolLink')
      .data('dt-target-id', toolId.substring(1))
      .addClass('dt-target-'+toolId.substring(1))
      .addClass('dt-link');
  } else if (type === 'color') {
    $element.data('dt-btn-type', "tool")
      .data('dt-target-id', toolId)
      .addClass('dt-target-'+toolId)
      .addClass('dt-btn-color')
      .css('background-color', this.master.tools[toolId].color);
  }
  $('<span>') // for the label
    .appendTo($element);
  return $element;
};

module.exports = UI;
