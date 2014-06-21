// Constructor function.
function DrawingTool(selector) {
  // Implement me!
  console.log("Drawing Tool created");
  var canvas = new fabric.Canvas(selector);

  var rect = new fabric.Rect({
    left:100,
    top: 100,
    fill: 'red',
    width: 20,
    height: 20
  });

  canvas.add(rect)
}

module.exports = DrawingTool;
