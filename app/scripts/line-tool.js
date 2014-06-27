var ShapeTool = require('scripts/shape-tool')

function LineTool(name, selector, drawTool) {

  ShapeTool.call(this, name, selector, drawTool);

  this.currentLine;

  var self = this

  this.addEventListener("mouse:down", function(e){ self.mouseDown(e); });
  this.addEventListener("mouse:move", function(e){ self.mouseMove(e); });
  this.addEventListener("mouse:up", function(e){ self.mouseUp(e); });
}

LineTool.prototype = Object.create(ShapeTool.prototype);
LineTool.prototype.constructor = LineTool;
LineTool.prototype.parent = ShapeTool.prototype;

LineTool.prototype.mouseDown = function(e){
  console.log("down");
  this.parent.mouseDown.call(this, e);
}

LineTool.prototype.mouseMove = function(e){
  this.parent.mouseMove.call(this, e);
  if (this.down){
    console.log("relevant move");
  }
}

LineTool.prototype.mouseUp = function(e){
  console.log("up");
  this.parent.mouseUp.call(this, e);
}

LineTool.prototype.activate = function() {
  // console.warn("At line tool activation");
  this.parent.activate.call(this);
}

module.exports = LineTool;
