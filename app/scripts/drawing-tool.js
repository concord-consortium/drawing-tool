// Constructor function.
function DrawingTool (selector) {
  // Implement me!
  console.log("Drawing Tool created");
  this.canvas = new fabric.Canvas(selector);
  fabric.Object.prototype.transparentCorners = false;

  this.getCanvas = function(){ return this.canvas; }

  this.selectionTool = new SelectionTool();
  this.lineTool = new LineTool();
  // var rectangleTool = new RectangleTool();
  // var ellipseTool = new EllipseTool();
  // var squareTool = new SquareTool();
  // var circleTool = new CircleTool();


  this.currentTool = this.selectionTool;
  console.log("drawing tool constructor finished");
}

var Tool = function Tool (selector){
  this.name = "Tool";
  this.active = false;

  this.btn = document.getElementById(selector);
  this.btn.addEventListener('click',function(){console.log("clicked")},false);
  // How much of this is bad practice? (also probably unneccessary)
  var self = this;
  this.btn.addEventListener('click',function(){self.setActive(true)},false);
  // this.btn.addEventListener('click',function(){this.setActive(true)},false);
}

Tool.prototype.getButton = function (){ return this.btn; }

Tool.prototype.setActive = function(active){
  console.log(this.name + " active? " +  active);
  if (this.active === active) { return active; }
  this.active = active;
  if (active === true){
    // this tool is now active
    console.log(this.name + " has been activated");
    this.activate();
  }
  else{
    // this tool has been deselected
    console.log(this.name + " is no longer active");
    // this.deactivate();
  }

  return active;
}

Tool.prototype.isActive = function(){ return this.active; }

function SelectionTool (){
  this.selector = "";
  this.name = "Selection Tool";
  console.log(this.name + " initialized");
  this.setActive(true);
}

SelectionTool.prototype = new Tool("select");
SelectionTool.prototype.activate = function(){ console.log(this.name + " success!")};

function LineTool(){
  this.selector = "";
  this.name = "Line Tool";
  console.log(this.name + " initialized");
  this.setActive(false);
}
LineTool.prototype = new Tool("line");
LineTool.prototype.activate = function(){ console.log(this.name + " success!")};


module.exports = DrawingTool;
