// Object contains the jQuery div with the subpalette
// in addition to other information (name and currently used tool)
function BtnGroup (groupName, buttons, static) {
  this.name = groupName;
  this.static = static || false;
  this.$buttons = buttons;
  this.$palette = $('<div class="dt-toolpalette dt-palette-' + this.name + '">')
    .data('dt-palette-id', this.name);

  if (!this.static) { this.$palette.hide(); }
  else { this.$palette.addClass('dt-static'); }

  // append the tools to the palette div
  for (var i = 0; i < this.$buttons.length; i++) {
    // TODO: the "if" is temporary
    if (this.$buttons[i] === undefined) {}
    else {this.$buttons[i].appendTo(this.$palette);}
  }

  // set the default current tool of each palette to the first
  // not 'link' tool
  var j = 0;
  for (; j < this.$buttons.length &&
    this.$buttons[j].data('dt-btn-type') !== 'tool'; j++) {}
  this.currentTool = buttons[j].data('dt-target-id');
}

BtnGroup.prototype.show = function(callback) {
  this.$palette.fadeIn(100, callback);
};

BtnGroup.prototype.hide = function(callback) {
  if (this.static) { return; }
  this.$palette.fadeOut(100, callback);
};

module.exports = BtnGroup;
