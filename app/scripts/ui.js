function UI (master, selector, CANVAS_ID, options) {
  this.master = master;
  this.CANVAS_ID = CANVAS_ID;
  this.options = options;

  this._initUI(selector);
}

UI.prototype.initTools = function() {
  this.tools = this.master.tools;
  this._initToolUI();
  this._initButtonUpdates();

  var test = new BtnGroup("d");

  var trash = this.buttons.trash;
  trash.hide();
  this.master.canvas.on("object:selected", function () { trash.show(); });
  this.master.canvas.on("selection:cleared", function () { trash.hide(); });
}

UI.prototype.setLabel = function (toolID, label) {
  this.$tools.find("#"+toolID).find('span').text(label);
}

UI.prototype._initButtonUpdates = function () {
  // handler that updates UI when the internal tool state changes
  for (var toolId in this.tools) {
    this.tools[toolId].addStateListener(this.updateUI);
  }

  // handler that updates internal state when the UI changes
  var master = this.master;
  $('.dt-btn').on('click touchstart', function (e) {
    var id = $(this).attr('id');
    master._toolButtonClicked(id);
    e.preventDefault();
  });
}

// Updates the UI when the internal state changes
UI.prototype.updateUI = function (e) {
  var $element = this.buttons[e.source.selector];
  if (e.active) { $element.addClass('dt-active') }
  else { $element.removeClass('dt-active'); }

  if (e.locked) { $element.addClass('dt-locked'); }
  else { $element.removeClass('dt-locked'); }
}

// initializes the UI (divs and canvas size)
UI.prototype._initUI = function (selector) {
  $(selector).empty();
  this.$element = $('<div class="dt-container">').appendTo(selector);
  this.$tools = $('<div class="dt-tools" data-toggle="buttons">')
    .appendTo(this.$element);
  var $canvasContainer = $('<div class="dt-canvas-container">')
    .attr('tabindex', 0) // makes the canvas focusable for keyboard events
    .appendTo(this.$element);
  $('<canvas>')
    .attr('id', this.CANVAS_ID)
    .attr('width', this.options.width + 'px')
    .attr('height', this.options.height + 'px')
    .appendTo($canvasContainer);
};

// initializes all the tools
UI.prototype._initToolUI = function () {
  this.buttons = {};
  for (var tool in this.tools) {
    this.buttons[tool] = this._initBtn(tool);
  }
}

// initializes each button
UI.prototype._initBtn = function (toolId) {
  var $element = $('<div class="dt-btn">')
    .attr('id', toolId)
    .appendTo(this.$tools);
  $('<span>')
    .appendTo($element);
  return $element;
}

function BtnGroup () {
  if (arguments.length <= 0) { return; }
  this._$buttons = arguments;
}

module.exports = UI;
