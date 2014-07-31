var inherit                 = require('scripts/inherit');
var Tool                    = require('scripts/tool');
var lineCustomControlPoints = require('scripts/fabric-extensions/line-custom-control-points');

var BASIC_SELECTION_PROPERTIES = {
  cornerSize: fabric.isTouchSupported ? 22 : 12,
  transparentCorners: false
};

function SelectionTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.canvas.on("object:selected", function (opt) {
    opt.target.set(BASIC_SELECTION_PROPERTIES);
  });

  // Set visual options of custom line control points.
  lineCustomControlPoints.controlPointColor = '#bcd2ff';
  lineCustomControlPoints.cornerSize = BASIC_SELECTION_PROPERTIES.cornerSize;
}

inherit(SelectionTool, Tool);

SelectionTool.BASIC_SELECTION_PROPERTIES = BASIC_SELECTION_PROPERTIES;

SelectionTool.prototype.activate = function () {
  SelectionTool.super.activate.call(this);
  this.setSelectable(true);
};

SelectionTool.prototype.deactivate = function () {
  SelectionTool.super.deactivate.call(this);
  this.setSelectable(false);
  this.canvas.deactivateAllWithDispatch();
};

SelectionTool.prototype.setSelectable = function (selectable) {
  this.canvas.selection = selectable;
  var items = this.canvas.getObjects();
  for (var i = items.length - 1; i >= 0; i--) {
    items[i].selectable = selectable;
  }
};

module.exports = SelectionTool;
