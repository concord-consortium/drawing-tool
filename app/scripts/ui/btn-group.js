// Object contains the jQuery div with the subpalette
// in addition to other information (name and currently used tool).
function BtnGroup (groupName, $buttons, $anchor) {
  this.name = groupName;
  this.$buttons = $buttons;
  this.$anchor = $anchor;

  this.$palette = $('<div class="dt-toolpalette ' + groupName + '">').data('dt-palette-id', this.name);
  // Append the tools to the palette div
  for (var i = 0; i < this.$buttons.length; i++) {
    this.$buttons[i].appendTo(this.$palette);
  }
  // Set the default current tool of each palette to the first tool.
  this.currentTool = $buttons[0].data('dt-target-id');

  this.$palette.hide();
}

BtnGroup.prototype.show = function (callback) {
  this.position();
  this.$palette.show(0, callback);

  var self = this;
  $(document).one('mousedown touchstart', function () {
    setTimeout(function () { self.hide(); }, 10);
  });
};

BtnGroup.prototype.hide = function (callback) {
  this.$palette.hide(0, callback);
};

BtnGroup.prototype.position = function () {
  var p = this.$anchor.position();
  this.$palette.css({
    position: 'absolute',
    top: p.top,
    left: p.left + this.$anchor.outerWidth()
  });
};

module.exports = BtnGroup;
