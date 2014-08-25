/**
 * Tool "Class"
 *
 * parameters:
 *  - name: string with the human-readable name of the tool (mainly used for debugging)
 *  - selector: shorter 'code' for the tool, used in the corresponding HTML element
 *  - drawTool: the master node that this tool belongs too
 */
function Tool(name, drawTool) {
  this.name = name || "Tool";
  this.master = drawTool;
  this.canvas = drawTool.canvas;
  this.active = false;
  this.singleUse = false;

  // fabric.js listeners of the tool
  this._listeners = [];

  // internal mechanisms that monitor the state of the tool
  this._stateListeners = [];
}

Tool.prototype.setActive = function (active) {
  if (this.singleUse) {
    console.warn("This is a single use tool. It was not activated.");
    return;
  }
  if (this.active === active) { return active; }
  this.active = active;
  if (active === true){
    this.activate();
  } else {
    this.deactivate();
  }

  return active;
};

Tool.prototype.activate = function () {
  for (var i = 0; i < this._listeners.length; i++) {
    var trigger = this._listeners[i].trigger;
    var action = this._listeners[i].action;
    this.canvas.on(trigger, action);
  }
  this._fireStateEvent();
};

// This function will be called when user tries to activate a tool that
// is already active. It can enable some special behavior.
// Implement this function in a subclass when needed.
Tool.prototype.activateAgain = function () {};

// This function will be implemented by singleUse tools that do not need
// to be activated
Tool.prototype.use = function () {};

Tool.prototype.deactivate = function () {
  for (var i = 0; i < this._listeners.length; i++) {
    var trigger = this._listeners[i].trigger;
    var action = this._listeners[i].action;
    this.canvas.off(trigger);
  }
  this._fireStateEvent();
};

// A tool's event listeners are attached to the `fabricjs` canvas
// and allow the tool to interact with a user's clicks and drags etc

// Add the tool's event listeners to a list that will be added
// to the canvas upon the tool's activation
Tool.prototype.addEventListener = function (eventTrigger, eventHandler) {
  this._listeners.push({
    trigger: eventTrigger,
    action: eventHandler
  });
};

// Remove tool's event listeners from those to be added to the canvas
// on tool activation
Tool.prototype.removeEventListener = function (trigger) {
  for (var i = 0; i < this._listeners.length; i++) {
    if (trigger == this._listeners[i].trigger){
      return this._listeners.splice(i,1);
    }
  }
};

// State events(listeners) are to monitor the state of the tool itself (active, locked etc)
// It allows the UI to keep track of the tool itself.

// Adds a state listener to the tool
Tool.prototype.addStateListener = function (stateHandler) {
  this._stateListeners.push(stateHandler);
};

// Removes a state listener from the tool
Tool.prototype.removeStateListener = function (stateHandler) {
  for (var i = 0; i < this._stateListeners.length; i++) {
    if (this._stateListeners[i] === stateHandler) {
      return this._stateListeners.splice(i, 1);
    }
  }
  return false;
};

Tool.prototype._fireStateEvent = function (extra, self) {
  var e = {
    source: self || this,
    active: this.active
  };
  for (var item in extra) {
    e[item] = extra[item];
  }
  for (var i = 0; i < this._stateListeners.length; i++) {
    // console.log(this._stateListeners[i]);
    this._stateListeners[i].call(this.master.ui, e);
  }
};

module.exports = Tool;
