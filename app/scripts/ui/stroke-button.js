var inherit     = require('scripts/inherit');
var BasicButton = require('scripts/ui/basic-button');

function StrokeButton(options, ui, drawingTool) {
  BasicButton.call(this, options, ui, drawingTool);
}

inherit(StrokeButton, BasicButton);

module.exports = StrokeButton;
