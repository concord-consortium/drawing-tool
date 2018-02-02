function UndoRedoKeyListener(undoRedo, drawTool) {
  this.undoRedo = undoRedo;
  this.drawTool = drawTool;
  this._listenForKeys = this._listenForKeys.bind(this);
  this.drawTool.$element.on('keydown', this._listenForKeys);
}

UndoRedoKeyListener.prototype._listenForKeys = function (e) {
  if (e.keyCode === 90 /* Z */ && (e.ctrlKey || e.metaKey)) {
    this.undoRedo.undo();
    e.preventDefault();
  } else if (e.keyCode === 89 /* V */ && (e.ctrlKey || e.metaKey)) {
    this.undoRedo.redo();
    e.preventDefault();
  }
};

UndoRedoKeyListener.prototype.detach = function (e) {
  this.drawTool.$element.off('keydown', this._listenForKeys);
};

module.exports = UndoRedoKeyListener;