var DrawingTool  = require('drawing-tool');
var UI           = require('ui');

function DTMain (selector) {
  this.drawingTool = new DrawingTool (selector);
  this.ui = new UI (drawingTool, selector, options);
}

module.exports = DTMain;
