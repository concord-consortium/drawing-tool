var inherit     = require('scripts/inherit');
var BasicButton = require('scripts/ui/basic-button');

function StampImageButton(options, ui, drawingTool) {
  options.onClick = function () {
    this.dt.tools.stamp.setStampImage(this._imageEl);
  };
  BasicButton.call(this, options, ui, drawingTool);

  this.$element.addClass('dt-img-btn');

  this._startWaiting();
  // TODO: REMOVE setTimeout, it's only for demo reasons.
  setTimeout(function () {
    fabric.util.loadImage(options.imageSrc, function (img) {
      this._imageEl = img;
      this.$image = $(this._imageEl).appendTo(this.$element);
      this._stopWaiting();
      if (options.setStampOnImgLoad) {
        this.dt.tools.stamp.setStampImage(this._imageEl);
      }
    }.bind(this), null, 'anonymous');
  }.bind(this), 5000);

  // Note that we should have some other event like 'stampToolImage:changed'.
  // However 'tool:changed' is good enough for now to handle all cases.
  // It's impossible to see this button without prior stamp tool activation.
  // So 'tool:changed' will be always emitted before and active state updated.
  drawingTool.on('tool:changed', function (toolName) {
    if (toolName === 'stamp' && drawingTool.tools.stamp.getStampImageSrc() === options.imageSrc) {
      this.setActive(true);
    } else {
      this.setActive(false);
    }
  }.bind(this));
}

inherit(StampImageButton, BasicButton);

StampImageButton.prototype._startWaiting = function () {
  this.setLocked(true);
  this.$element.find('span')
    .addClass('dt-spin')
    .text('.');
};

StampImageButton.prototype._stopWaiting = function () {
  this.setLocked(false);
  this.$element.find('span')
    .removeClass('dt-spin')
    .text('');
};

module.exports = StampImageButton;
