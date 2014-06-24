// Constructor function.
function DrawingTool (selector) {
  // Implement me!
  console.log("Drawing Tool created");
  this.canvas = new fabric.Canvas(selector);
  fabric.Object.prototype.transparentCorners = false;

  this.getCanvas = function(){ return this.canvas; }

  var rect3 = new fabric.Rect({
    width: 50, height: 100, left: 275, top: 350, angle: 45,
    stroke: '#eee', strokeWidth: 10,
    fill: 'rgba(0,0,200,0.5)'
  });
  this.canvas.add(rect3);

  $(document).ready(function(){
    $('.btn').click(function(){
      console.log($(this).find("input").val());
    });
  });

  this.selectionTool = new SelectionTool();
  this.lineTool = new LineTool();
  // this.rectangleTool = new RectangleTool();
  // var ellipseTool = new EllipseTool();
  // var squareTool = new SquareTool();
  // var circleTool = new CircleTool();

  var tools = [this.selectionTool, this.lineTool];//, this.rectangleTool];
  for (var i = tools.length - 1; i >= 0; i--) {
    console.log(tools[i]);
    // tools[i].getButton().addEventListener("click", function(){console.log("hihihih")},false);
  };

  this.currentTool = this.selectionTool;
  console.log("drawing tool constructor finished");
}

DrawingTool.prototype.toolManager = function(){
  console.log(this.name);
}

var Tool = function Tool (selector){
  this.name = "Tool";
  this.active = false;

  if (document.getElementById(selector).checked){
    console.log(this.name + " is checked");
  }
  else { console.log("nope"); }

  // this.btn = document.getElementById(selector);
  // this.btn.addEventListener('click',function(){console.log("clicked")},false);

  // // How much of this is bad practice? (also probably unneccessary)
  // var self = this;
  // this.btn.addEventListener('click',function(){self.setActive(true)},false);
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
  this.name = "Selection Tool";
  console.log(this.name + " initialized");
  this.setActive(true);
}

SelectionTool.prototype = new Tool("select");
SelectionTool.prototype.activate = function(){ console.log(this.name + " success!")};

function LineTool(){
  this.name = "Line Tool";
  console.log(this.name + " initialized");
  this.setActive(false);
}
LineTool.prototype = new Tool("line");
LineTool.prototype.activate = function(){ console.log(this.name + " success!")};

// function RectangleTool(){
//   this.name = "RectangleTool - Test";
//   console.log(this.name + " initialized");
//   this.setActive(false);
// }
// RectangleTool.prototype = new Tool("rect");
// RectangleTool.prototype.activate = function(){
//   console.log(this.name + " success!");
// }


module.exports = DrawingTool;
