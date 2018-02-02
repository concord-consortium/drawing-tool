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

FirebaseUndoRedo.prototype.saveState = function (optionalObj, optionalEventName) {
  this._firebaseManager.saveState(optionalObj, optionalEventName);
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
var TEXT_CHANGE = "textChange";

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

  this.initialLoad = true;

  // create the reference to the undo/redo info, we use a child as existing codraw documents use the rawData child
  this.undoRedoRef.once("value", function (snapshot) {
    this.undoRedoRef.off();

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
      }.bind(this));
    }
    else {
      this.startListeners();
    }
  }.bind(this));
}

FirebaseManager.prototype.startListeners = function () {
  this.childAddedToStatesRef = this.statesRef.on("child_added", this.stateAdded.bind(this));
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

FirebaseManager.prototype.stateAdded = function (snapshot, prevKey) {
  var state = snapshot.val(),
      key = snapshot.key,
      value = null,
      index, change, changedState, changedObj;

  if (!this.states[key]) {
    switch (state.type) {
      case FULL_STATE:
        this.states[key] = {
          type: state.type,
          value: JSON.parse(state.value),
          json: state.value
        };
        break;

      case TEXT_CHANGE:
        change = JSON.parse(state.value);
        changedStateValue = this.states[change.stateKey] ? JSON.parse(JSON.stringify(this.states[change.stateKey].value)) : null;
        if (!changedStateValue || !changedStateValue.canvas || !changedStateValue.canvas.objects) {
          return;
        }
        changedObj = changedStateValue.canvas.objects.find(function (obj) {
          return obj._uuid === change.uuid;
        });
        if (!changedObj) {
          return;
        }
        changedObj._uuid = change.uuid;
        changedObj._clientId = change.clientId;
        changedObj.text = change.text;
        this.states[key] = {
          type: state.type,
          change: change,
          value: changedStateValue,
          json: JSON.stringify(changedStateValue)
        };
        break;
    }

    index = this.stack.indexOf(prevKey);
    if (index !== -1) {
      this.stack.splice(index + 1, 0, key);
    }
    else {
      this.stack.push(key);
    }
  }

  if (this.pendingStateKey === key) {
    this.moveToNewState(this.pendingStateKey);
  }
};

FirebaseManager.prototype.stateRemoved = function (snapshot) {
  var removedStateKey = snapshot.key,
      index = this.stack.indexOf(removedStateKey);
  delete this.states[removedStateKey];
  this.stack.splice(index, 1);
  this.stackIndex = this.stack.indexOf(this.currentStateKey);
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

FirebaseManager.prototype.moveToNewState = function (newStateKey) {
  var newState = this.states[newStateKey],
      newStackIndex = this.stack.indexOf(newStateKey),
      activeObject, change, textObject, fullStateStackIndex, keys, singleStateMove, multiStateMove;

  singleStateMove = function (newStateKey, newState, callback) {
    var localTextChange;

    this.currentStateJSON = newState.json;
    this.currentStateKey = newStateKey;
    this.stackIndex = newStackIndex;

    switch (newState.type) {
      case FULL_STATE:
        this.loadingFromJSON = true;
        this.drawTool.load(newState.value, function () {
          this.drawTool._fireHistoryEvents();
          this.loadingFromJSON = false;
          if (callback) {
            callback();
          }
        }.bind(this), true);
        break;

      case TEXT_CHANGE:
        change = newState.change;
        textObject = this.drawTool.canvas.getObjectByUUID(change.uuid);
        if (textObject) {
          textObject.clientId = change.clientId;
          textObject.setText(change.text);
          if (textObject.isEditing) {
            localTextChange = this._localTextChanges[textObject._uuid];
            activeObject.setSelectionStart(localTextChange ? localTextChange.selectionStart : text.length);
            activeObject.setSelectionEnd(localTextChange ? localTextChange.selectionEnd : text.length);
          }
        }
        if (callback) {
          callback();
        }
        else {
          this.drawTool.canvas.renderAll();
        }
        break;
    }
  }.bind(this);

  multiStateMove = function (keys) {
    var key = keys.shift();
    if (key) {
      var state = this.states[key];
      singleStateMove(key, state, function () {
        // to avoid stack overflows
        setTimeout(function () {
          multiStateMove(keys);
        }, 1);
      });
    }
    else {
      this.drawTool.canvas.renderAll()
    }
  }.bind(this);

  if (newState) {
    this.pendingStateKey = null;
    if (this.currentStateKey !== newStateKey) {

      if (this.initialLoad) {
        this.initialLoad = false;

        // go back and reapply the last full state and then all the other state updates up until now
        for (fullStateStackIndex = newStackIndex; (fullStateStackIndex >= 0) && (this.states[this.stack[fullStateStackIndex]].type !== FULL_STATE); fullStateStackIndex--);
        if (fullStateStackIndex < 0) {
          alert("Unable to find last full state keyframe!");
          return;
        }
        keys = this.stack.slice(fullStateStackIndex, newStackIndex + 1);
        multiStateMove(keys);
      }
      else {
        if (newStackIndex < this.stackIndex) {
          // remove keyboard focus if editing so we don't reapply the text during the load
          activeObject = this.drawTool.canvas.getActiveObject();
          if (activeObject && (activeObject.type === "i-text")) {
            this.drawTool.canvas.deactivateAll();
          }
        }
        singleStateMove(newStateKey, newState);
      }
    }
  }
};

FirebaseManager.prototype.findNextStateKey = function (direction) {
  var newStackIndex = this.stackIndex + direction;
  if ((newStackIndex < 0) || (newStackIndex >= this.stack.length)) {
    return null;
  }
  return this.stack[newStackIndex];
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
    value: value
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

FirebaseManager.prototype.saveState = function (optionalObj, optionalEventName) {
  // to avoid a load loop when text changes - fabric triggers a text change after it calls clear if a text object is currently selected
  if (this.loadingFromJSON) {
    return;
  }

  var type, value;

  if (optionalObj && (optionalEventName === "text:changed")) {
    type = TEXT_CHANGE;
    value = {
      uuid: optionalObj._uuid,
      clientId: optionalObj._clientId,
      stateKey: this.currentStateKey,
      text: optionalObj.text
    };
  }
  else {
    type = FULL_STATE;
    value = this.drawTool.getJSON();
    if (value === this.currentStateJSON) {
      return;
    }
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

