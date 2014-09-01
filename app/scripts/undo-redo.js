var MAX_HISTORY_LENGTH = 100;

function UndoRedo(drawTool) {
  this.dt = drawTool;
  this.canvas = drawTool.canvas;
  this._suppressHistoryUpdate = false;

  this.reset();
  this._saveStateOnUserInteraction();
}

UndoRedo.prototype.undo = function () {
  var prevState = this._storage[this._idx - 1];
  if (!prevState) {
    return;
  }
  this._load(prevState);
  this._idx--;
};

UndoRedo.prototype.redo = function () {
  var nextState = this._storage[this._idx + 1];
  if (!nextState) {
    return;
  }
  this._load(nextState);
  this._idx++;
};

UndoRedo.prototype.saveState = function (opt) {
  var newState = this.dt.save();
  if (this._suppressHistoryUpdate || newState === this._lastState()) {
    return;
  }
  this._idx += 1;
  this._storage[this._idx] = newState;
  // Discard all states after current one.
  this._storage.length = this._idx + 1;
  this._cutOffOldStates();
};

UndoRedo.prototype.reset = function () {
  this._storage = [];
  this._idx = -1;
};

UndoRedo.prototype.canUndo = function () {
  return !!this._storage[this._idx - 1];
};

UndoRedo.prototype.canRedo = function () {
  return !!this._storage[this._idx + 1];
};

UndoRedo.prototype.withoutHistoryUpdate = function (callback) {
  this._suppressHistoryUpdate = true;
  callback();
  this._suppressHistoryUpdate = false;
};

UndoRedo.prototype._lastState = function () {
  return this._storage[this._idx];
};

UndoRedo.prototype._load = function (state) {
  var dt = this.dt;
  // Note that #load is a normal action that updates history. However when
  // a state is restored from the history, it's definitely unwanted.
  this.withoutHistoryUpdate(function () {
    dt.load(state);
  });
};

UndoRedo.prototype._saveStateOnUserInteraction = function () {
  this.canvas.on('object:modified', function () {
    this.saveState();
  }.bind(this));
};

UndoRedo.prototype._cutOffOldStates = function () {
  var statesToRemove = this._storage.length - MAX_HISTORY_LENGTH;
  if (statesToRemove > 0) {
    this._storage.splice(0, statesToRemove);
    this._idx = this._storage.length - 1;
  }
};

module.exports = UndoRedo;
