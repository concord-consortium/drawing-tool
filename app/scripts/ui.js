var Tool              = require('scripts/tool');
var SelectionTool     = require('scripts/tools/select-tool');
var LineTool          = require('scripts/tools/line-tool');
var RectangleTool     = require('scripts/tools/rect-tool');
var EllipseTool       = require('scripts/tools/ellipse-tool');
var SquareTool        = require('scripts/tools/square-tool');
var CircleTool        = require('scripts/tools/circle-tool');
var FreeDrawTool      = require('scripts/tools/free-draw');
var DeleteTool        = require('scripts/tools/delete-tool');

function UI (master, selector, options) {
  this.master = master;
  this.options = options;

  this._initUI(selector);
}

UI.prototype.initTools = function(p) {
  var selectionTool = new SelectionTool("Selection Tool", "select", this.master);
  var lineTool = new LineTool("Line Tool", "line", this.master);
  var rectangleTool = new RectangleTool("Rectangle Tool", "rect", this.master);
  var ellipseTool = new EllipseTool("Ellipse Tool", "ellipse", this.master);
  var squareTool = new SquareTool("Square Tool", "square", this.master);
  var circleTool = new CircleTool("Circle Tool", "circle", this.master);
  var freeDrawTool = new FreeDrawTool("Free Draw Tool", "free", this.master);
  var deleteTool = new DeleteTool("Delete Tool", "trash", this.master);

  var palettes = p || {
    shapes: ['-select', 'rect', 'ellipse', 'square', 'circle'],
    main: ['select', 'line', '-shapes', 'free', 'trash']
  };
  this._initToolUI(palettes);
  this._initButtonUpdates();

  this.setLabel(selectionTool.selector,  "S");
  this.setLabel(lineTool.selector,       "L");
  this.setLabel(rectangleTool.selector,  "R");
  this.setLabel(ellipseTool.selector,    "E");
  this.setLabel(squareTool.selector,     "Sq");
  this.setLabel(circleTool.selector,     "C");
  this.setLabel(freeDrawTool.selector,   "F");
  this.setLabel(deleteTool.selector,     "Tr");
  this.setLabel("-shapes",               "Sh");
  this.setLabel("-select",               "S");

  this.palettes.main.$palette.show();

  var trash = this.$buttons.trash;
  trash.hide();
  this.master.canvas.on("object:selected", function () { trash.show(); });
  this.master.canvas.on("selection:cleared", function () { trash.hide(); });
}

UI.prototype.setLabel = function (toolID, label) {
  this.$tools.find("#"+toolID).find('span').text(label);
}

UI.prototype._initButtonUpdates = function () {
  // handler that updates UI when the internal tool state changes
  for (var toolId in this.master.tools) {
    this.master.tools[toolId].addStateListener(this.updateUI);
  }

  // handler that updates internal state when the UI changes
  var self = this;
  $('.dt-btn').on('click touchstart', function (e) {
    var id = $(this).attr('id');
    if (id.charAt(0) == "-") {
      if (id.substring(1) in self.palettes) {
        self._paletteButtonClicked(id.substring(1));
      } else {
        self._toolButtonClicked(id.substring(1));
      }
    } else {
      self._toolButtonClicked(id);
    }
    e.preventDefault();
  });
};

UI.prototype._paletteButtonClicked = function (selector) {
  for (var p in this.palettes) {
    if (p === selector) {
      this.palettes[p].$palette.show();
      this.master.chooseTool(this.palettes[p].currentTool);
    } else { this.palettes[p].$palette.hide(); }
  }
};

// Updates the UI when the internal state changes
UI.prototype.updateUI = function (e) {
  var $element = this.$buttons[e.source.selector];
  if (e.active) { $element.addClass('dt-active') }
  else { $element.removeClass('dt-active'); }

  if (e.locked) { $element.addClass('dt-locked'); }
  else { $element.removeClass('dt-locked'); }
};

UI.prototype._toolButtonClicked = function (toolSelector) {
  var newTool = this.master.tools[toolSelector];
  var $newPalette = this.$buttons[newTool.selector].parent();
  // if the palette that the tool belongs to is not visible
  // then make it visible
  if (!$newPalette.is(':visible')) {
    this._paletteButtonClicked($newPalette.attr('id'));
  }

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

  this.palettes[$newPalette.attr('id')].currentTool = newTool.selector;

  this.master.canvas.renderAll();
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
    var buttons = [];
    var btnNames = palettes[palette];

    for (var i = 0; i < btnNames.length; i++) {
      var $btn = this._initBtn(btnNames[i]);
      if (btnNames[i].charAt(0) === '-') {
        $btn.addClass('linkToPalette');
      }
      buttons[i] = $btn;
      this.$buttons[btnNames[i]] = $btn;
    }
    this.palettes[palette] = new BtnGroup(palette, buttons);
    this.palettes[palette].$palette.appendTo(this.$tools);
  }

};

// initializes each button
UI.prototype._initBtn = function (toolId) {
  var $element = $('<div class="dt-btn">')
    .attr('id', toolId);
  $('<span>')
    .appendTo($element);
  return $element;
};

function BtnGroup (groupName, buttons) {
  this.name = groupName;
  this.$buttons = buttons;
  this.$palette = $('<div class="dt-toolpalette" id="' + this.name + '">').hide();

  // append the tools to the palette div
  for (var i = 0; i < this.$buttons.length; i++) {
    // TODO: the "if" is temporary
    if (this.$buttons[i] === undefined) {}
    else {this.$buttons[i].appendTo(this.$palette);}
  }

  // set the default current tool of each palette to the first
  // not 'link' tool
  var j = 0;
  for (; j < this.$buttons.length &&
    this.$buttons[j].attr('id').charAt(0) === '-'; j++) {}
  this.currentTool = buttons[j].attr('id');
};

module.exports = UI;
