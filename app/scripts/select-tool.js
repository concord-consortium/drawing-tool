var inherit = require('scripts/inherit');
var Tool    = require('scripts/tool');

function SelectionTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.setLabel('S');
}

inherit(SelectionTool, Tool);

SelectionTool.prototype.activate = function () {
  this.setSelectable(true);
};

SelectionTool.prototype.deactivate = function () {
  this.setSelectable(false);
  this.canvas.deactivateAll();
};

SelectionTool.prototype.setSelectable = function (selectable) {
  this.canvas.selection = selectable;
  var items = this.canvas.getObjects();
  for (var i = items.length - 1; i >= 0; i--) {
    items[i].selectable = selectable;
  }
  // might be needed?
  // fabric.Group.prototype.selectable = selectable;
};

module.exports = SelectionTool;
