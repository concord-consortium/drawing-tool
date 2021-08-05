var $           = require('jquery');
var inherit     = require('../inherit');
var BasicButton = require('./basic-button');

function StampImageButton(options, ui, drawingTool) {
  options.onClick = function () {
    this.dt.setStampObject(this._stamp, this._imageSrc);
  };
  BasicButton.call(this, options, ui, drawingTool);

  this._stamp = null;
  this._imageSrc = drawingTool.proxy(options.imageSrc);

  this.$element.addClass('dt-img-btn');

  this._startWaiting();
  this.dt.tools.stamp.loadImage(this._imageSrc, function (fabricObj, img) {
    this._stamp = fabricObj;
    this.$image = $(img).appendTo(this.$element);
    this._stopWaiting();
    if (options.setStampOnImgLoad) {
      this.dt.setStampObject(this._stamp, this._imageSrc);
    }
  }.bind(this), null, 'anonymous');

  // Note that we should have some other event like 'stampToolImage:changed'.
  // However 'tool:changed' is good enough for now to handle all cases.
  // It's impossible to see this button without prior stamp tool activation.
  // So 'tool:changed' will be always emitted before and active state updated.
  drawingTool.on('tool:changed', function (toolName) {
    if (toolName === 'stamp' && drawingTool.tools.stamp.getStampSrc() === this._imageSrc) {
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
    .text('/');
};

StampImageButton.prototype._stopWaiting = function () {
  this.setLocked(false);
  this.$element.find('span')
    .removeClass('dt-spin')
    .text('');
};

module.exports = StampImageButton;
