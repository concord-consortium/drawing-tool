var inherit  = require('scripts/inherit');
var Tool     = require('scripts/tool');

function DeleteTool(name, selector, drawTool) {
  Tool.call(this, name, selector, drawTool);

  this.setLabel('Tr');

  // // delete the selected object(s)
  // // see: https://www.pivotaltracker.com/story/show/74415780
  // $('.dt-canvas-container').keydown(function(e) {
  //   console.log(e);
  //   if (e.keyCode === 8) {
  //     if (canvas.getActiveObject()) {
  //       canvas.remove(canvas.getActiveObject());
  //     } else if (self.canvas.getActiveGroup()) {
  //       canvas.getActiveGroup().forEachObject(function(o){ canvas.remove(o) });
  //       canvas.discardActiveGroup().renderAll();
  //     }
  //     e.preventDefault();
  //   }
  // });
}

inherit(DeleteTool, Tool);

// on activation, immediately dump back into the selection tool
DeleteTool.prototype.activate = function() {
  // this.master.changeOutOfTool(this.selector);
  this.master.changeOutOfTool();
}

DeleteTool.prototype.deactivate = function() {}

module.exports = DeleteTool;
