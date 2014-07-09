var inherit  = require('scripts/inherit');
var Tool     = require('scripts/tool');

function DeleteTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.singleUse = true;

  // delete the selected object(s)
  // see: https://www.pivotaltracker.com/story/show/74415780
  var self = this;
  $('.dt-canvas-container').keydown(function(e) {
    if (e.keyCode === 8) {
      e.preventDefault();
      self._delete();
    }
  });

  this.canvas.on("object:selected", function () { self.show(); });
  this.canvas.on("selection:cleared", function () { self.hide(); });
}

inherit(DeleteTool, Tool);

DeleteTool.prototype.use = function () {
  this._delete();
};

DeleteTool.prototype._delete = function () {
  var canvas = this.canvas;
  if (canvas.getActiveObject()) {
    canvas.remove(canvas.getActiveObject());
  } else if (canvas.getActiveGroup()) {
    canvas.getActiveGroup().forEachObject(function(o){ canvas.remove(o); });
    canvas.discardActiveGroup().renderAll();
  }
};

DeleteTool.prototype.initUI = function () {
  this.$element = $('<div class="dt-btn">')
    .attr('id', this.selector)
    .appendTo(this.master.$tools)
    .hide();
  $('<span>')
    .text('Tr')
    .appendTo(this.$element);
};

DeleteTool.prototype.show = function () { this.$element.show(); };
DeleteTool.prototype.hide = function () { this.$element.hide(); };

module.exports = DeleteTool;
