// Constructor function.
function DrawingTool(selector) {
  // Implement me!
  console.log("Drawing Tool created");
  var canvas = new fabric.Canvas(selector);
  fabric.Object.prototype.transparentCorners = false;

  addRect(canvas,100,100,'red',20,20);
  addCirc(canvas,300,100,'green',20,50);
  var addRectBtn = document.getElementById("rect");
  addRectBtn.addEventListener('click',
  function(){addRect(canvas,200,200,"blue",100,100)},
  false);

  var addCircBtn = document.getElementById("circ");
  addCircBtn.addEventListener('click',
  function(){addCirc(canvas,22,100,'green',20)},
  false);

  var fancyBtn = document.getElementById("fancy");
  fancyBtn.addEventListener('click',
  function(){
    console.log("click, boom.");
    canvas.selection = false;
    var startX = 0;
    var startY = 0;
    var rect = new fabric.Rect();
    canvas.on('mouse:down', function(options){
      console.log("mouse down");
      startX = options.e.layerX;
      startY = options.e.layerY;
      rect = addRect(canvas, startX, startY, "purple",0,0);
      canvas.on('mouse:move', function(options){
        console.log("resizing");
        w = options.e.layerX - startX;
        h = options.e.layerY - startY;
        rect.width = w;
        rect.height = h;
        canvas.renderAll(false);
      })
    })
    canvas.on('mouse:up', function(options){
      if (rect.width < 0){
        rect.width = -rect.width;
        rect.left = rect.left - rect.width;
      }
      if (rect.height < 0){
        rect.height = -rect.height;
        rect.top = rect.top - rect.height;
      }

      canvas.renderAll(false);
      canvas.selection = true;
      rect.selection = true;
      canvas.off('mouse:down');
      canvas.off('mouse:move');
      canvas.off('mouse:up');
      console.log("done?");
      console.log(rect.width);
    })
    console.log(canvas.getObjects().length);
  },
  false);

}

// adds a new rectangle to the canvas based on provided
// parameters:
// l - left
// t - top
// f - fill color
// w - width
// h - height
function addRect(c, l, t, f, w, h){
  console.log("added a " + f + " rectangle!");
  var rect = new fabric.Rect({
    left: l, top: t, fill: f, width: w, height: h
  });
  c.add(rect);
  return rect;
}

function addCirc(c, l, t, f, r){
  console.log("added a " + f + " circle!");
  var circle = new fabric.Circle({
    left: l, top: t, fill: f, radius: r
  });
  c.add(circle);
  return;
}

module.exports = DrawingTool;
