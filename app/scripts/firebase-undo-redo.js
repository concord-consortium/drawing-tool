// firebase-undo-redo
var UndoRedoKeyListener = require('./undo-redo-key-listener');

// FirebaseUndoRedo - the public class to replace the default UndoRedo class - it needs to have the exact same interface!

function FirebaseUndoRedo(drawTool, options) {
  this._firebaseManager = new FirebaseManager(this, drawTool, options);
  this._keyListener = new UndoRedoKeyListener(this, drawTool);
}

FirebaseUndoRedo.prototype.detach = function () {
  this._keyListener.detach();
  this._firebaseManager.stopListeners();
};

FirebaseUndoRedo.prototype.undo = function () {
  this._firebaseManager.undo();
};

FirebaseUndoRedo.prototype.redo = function () {
  this._firebaseManager.redo();
};

FirebaseUndoRedo.prototype.saveState = function (optionalObj) {
  this._firebaseManager.saveState(optionalObj);
};

FirebaseUndoRedo.prototype.reset = function () {
  this._firebaseManager.reset();
};

FirebaseUndoRedo.prototype.canUndo = function () {
  return this._firebaseManager.canUndo();
};

FirebaseUndoRedo.prototype.canRedo = function () {
  return this._firebaseManager.canRedo();
};

module.exports = FirebaseUndoRedo;

// FirebaseManager - this manages the undo/redo system in Firebase, calls are proxied to it from FirebaseUndoRedo

var FULL_STATE = "fullState";
var DELTA_STATE = "deltaState";
var OBJ_STATE = "objState";

function FirebaseManager(undoRedo, drawTool, options) {
  this.drawTool = drawTool;
  this.firebase = options.firebase;

  this.stackIndex = -1;
  this.stack = [];
  this.states = {};
  this.currentStateKey = null;
  this.currentStateJSON = null;

  this.docRef = this.firebase.database().ref(options.refPath);
  this.undoRedoRef = this.docRef.child("undoRedo");
  this.currentStateKeyRef = this.undoRedoRef.child("currentStateKey");
  this.statesRef = this.undoRedoRef.child("states");

  // create the reference to the undo/redo info, we use a child as existing codraw documents use the rawData child
  this.undoRedoRef.once("value", function (snapshot) {
    var val = snapshot.val();
    // if no existing undoRedo data check if this is an older document with rawData
    if (val === null) {
      var rawDataRef = this.docRef.child("rawData");
      rawDataRef.once("value", function (rawSnapshot) {
        var rawVal = rawSnapshot.val();
        if (rawVal) {
          this.pushToFirebase(FULL_STATE, rawVal, this.startListeners.bind(this));
        }
        else {
          this.startListeners();
        }
        this.undoRedoRef.off();
      }.bind(this));
    }
    else {
      var states = val.states || {};
      Object.keys(states).forEach(function (key) {
        this.addRemoteState(key, states[key]);
      }.bind(this));
      this.sortStack();
      this.startListeners();
      this.undoRedoRef.off();
    }
  }.bind(this));
}

FirebaseManager.prototype.addRemoteState = function (key, remoteState) {
  var value = null;
  switch (remoteState.type) {
    case FULL_STATE:
      value = JSON.parse(remoteState.value);
      break;
    case OBJ_STATE:
      // TODO - lookup this.states[value.stateKey] and if found clone new state with value.obj replaced in it
      break;
    case DELTA_STATE:
      // TODO - use jsonpatch
      break;
  }
  this.states[key] = value;
  this.stack.push({
    key: key,
    createdAt: remoteState.createdAt
  });
};

FirebaseManager.prototype.startListeners = function () {
  this.childAddedToStatesRef = this.statesRef.limitToLast(1).on("child_added", this.stateAdded.bind(this));
  this.childRemovedFromStatesRef = this.statesRef.on("child_removed", this.stateRemoved.bind(this));
  this.currentStateKeyRefChanged = this.currentStateKeyRef.on("value", this.currentStateKeyChanged.bind(this));
};

FirebaseManager.prototype.stopListeners = function () {
  if (this.childAddedToStatesRef) {
    this.childAddedToStatesRef.off();
  }
  if (this.currentStateKeyRefChanged) {
    this.currentStateKeyRefChanged.off();
  }
};

FirebaseManager.prototype.stateAdded = function (snapshot) {
  var addedState = snapshot.val(),
      createdAt = addedState.createdAt,
      addedStateKey = snapshot.key,
      value = JSON.parse(addedState.value),
      normalizedState;

  if (!this.states[addedStateKey]) {
    this.addRemoteState(addedStateKey, addedState);

    // see if we can just push the state on top of the stack or if we need to insert it somewhere within
    if (this.stack.length > 1 && (this.stack[this.stack.length - 2].createdAt > createdAt)) {
      this.sortStack();
    }
  }

  if (this.pendingStateKey === addedStateKey) {
    this.moveToNewState(this.pendingStateKey);
  }
};

FirebaseManager.prototype.stateRemoved = function (snapshot) {
  var removedStateKey = snapshot.key;
  if (this.states[removedStateKey]) {
    delete this.states[removedStateKey];
    this.stack.splice(this.findStackIndex(removedStateKey), 1);
    this.stackIndex = this.findStackIndex(this.currentStateKey);
  }
};

FirebaseManager.prototype.currentStateKeyChanged = function (snapshot) {
  var newStateKey = snapshot.val();
  if (newStateKey === null) {
    this.currentStateJSON = null;
    this.currentStateKey = null;
    this.stackIndex = -1;
    this.drawTool.clear(false, true);
    this.drawTool._fireHistoryEvents();
  }
  else if (this.states[newStateKey]) {
    this.pendingStateKey = null;
    this.moveToNewState(newStateKey);
  }
  else {
    this.pendingStateKey = newStateKey;
  }
};

FirebaseManager.prototype.sortStack = function () {
  this.stack.sort(function (a, b) {
    // first sort by the server time
    if (a.createdAt != b.createdAt) {
      return a.createdAt - b.createdAt;
    }
    // and on ties sort by key
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return 0;
  });
  this.stackIndex = this.findStackIndex(this.currentStateKey);
};

FirebaseManager.prototype.findStackIndex = function (stateKey) {
  return this.stack.findIndex(function (item) {
    return item.key === stateKey;
  });
};

FirebaseManager.prototype.moveToNewState = function (newStateKey) {
  var newState = this.states[newStateKey],
      newStackIndex = this.findStackIndex(newStateKey);

  if (newState && (newStackIndex !== -1)) {
    if (this.currentStateKey !== newStateKey) {
      this.currentStateJSON = JSON.stringify(newState);
      this.currentStateKey = newStateKey;
      this.stackIndex = newStackIndex;
      this.drawTool.load(newState, function () {
        this.drawTool._fireHistoryEvents();
      }.bind(this), true);
    }
    this.pendingStateKey = null;
  }
};

FirebaseManager.prototype.findNextStateKey = function (direction) {
  var newStackIndex = this.stackIndex + direction;
  if ((newStackIndex < 0) || (newStackIndex >= this.stack.length)) {
    return null;
  }
  return this.stack[newStackIndex].key;
};

FirebaseManager.prototype.pushToFirebase = function (type, objectOrString, callback) {
  var value, pushRef;

  if ((typeof objectOrString === "string") || (objectOrString instanceof String)) {
    value = objectOrString;
  }
  else {
    value = JSON.stringify(objectOrString);
  }

  pushRef = this.statesRef.push();
  pushRef.set({
    type: type,
    value: value,
    createdAt: this.firebase.database.ServerValue.TIMESTAMP
  }, function (error) {
    if (error) {
      alert("Firebase error: " + error.toString());
    }
    else if (callback) {
      this.currentStateKeyRef.set(pushRef.key);
      callback();
    }
  }.bind(this));
};

// the remaining functions are proxied from FirebaseUndoRedo

FirebaseManager.prototype.undo = function () {
  this.currentStateKeyRef.set(this.findNextStateKey(-1));
};

FirebaseManager.prototype.redo = function () {
  this.currentStateKeyRef.set(this.findNextStateKey(+1));
};

FirebaseManager.prototype.saveState = function (optionalObj) {
  var type = optionalObj ? OBJ_STATE : FULL_STATE;
  var value = optionalObj ? {stateKey: this.currentStateKey, obj: optionalObj.toObject()} : this.drawTool.getJSON();

  if ((type === FULL_STATE) && (value === this.currentStateJSON)) {
    return;
  }

  // gather redo keys to cull (if we are saving after undoing)
  var keysToCull = {},
      cull = false;
  for (var i = this.stackIndex + 1; i < this.stack.length; i++) {
    keysToCull[this.stack[i].key] = null;
    cull = true;
  }

  this.pushToFirebase(type, value, function () {
    if (cull) {
      this.statesRef.update(keysToCull);
    }
  }.bind(this));
};

FirebaseManager.prototype.reset = function () {
  this.statesRef.set({});
  this.currentStateKeyRef.set(null);
};

FirebaseManager.prototype.canUndo = function () {
  return this.stackIndex >= 0;
};

FirebaseManager.prototype.canRedo = function () {
  return this.stackIndex < this.stack.length - 1;
};

