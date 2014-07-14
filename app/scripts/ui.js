function UI (master) {
  this.master = master;
  this.tools = master.tools;

  this.initUI();
  this._initButtonUpdates();

  var trash = this.buttons.trash;
  trash.hide();
  this.master.canvas.on("object:selected", function () { trash.show(); });
  this.master.canvas.on("selection:cleared", function () { trash.hide(); });

}

UI.prototype._initButtonUpdates = function () {
  // update UI when the internal tool state changes
  for (var toolId in this.tools) {
    this.tools[toolId].addStateListener(this.updateUI);
  }

  // update internal state when the UI changes
  var master = this.master;
  $('.dt-btn').on('click touchstart', function (e) {
    var id = $(this).attr('id');
    master._toolButtonClicked(id);
    e.preventDefault();
  });
}

UI.prototype.updateUI = function (e) {
  var $element = this.buttons[e.source.selector];
  if (e.active) { $element.addClass('dt-active') }
  else { $element.removeClass('dt-active'); }

  if (e.locked) { $element.addClass('dt-locked'); }
  else { $element.removeClass('dt-locked'); }
}

UI.prototype.initUI = function () {
  this.buttons = {};
  for (var tool in this.tools) {
    this.buttons[tool] = this._initBtn(tool);
  }
}

UI.prototype._initBtn = function (toolId) {
  var $element = $('<div class="dt-btn">')
    .attr('id', toolId)
    .appendTo(this.master.$tools);
  $('<span>')
    .appendTo(this.$element);
  return $element;
}

module.exports = UI;
