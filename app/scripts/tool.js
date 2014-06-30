/*
 * Tool "Class"
 */
function Tool(name, selector, drawTool) {
  console.info(name);

  this.name = name || "Tool";
  this.selector = selector || "";
  this.master = drawTool;
  this.canvas = drawTool.canvas;
  this.active = false;

  this._listeners = [];
}

Tool.prototype.setActive = function (active) {
  // console.log(this.name + " active? " +  this.active);
  if (this.active === active) { return active; }
  this.active = active;
  if (active === true){
    // this tool is now active
    console.log("Activating " + this.name);
    this.activate();
  } else {
    // this tool has been deselected
    console.log("Deactivating " + this.name);
    this.deactivate();
  }

  return active;
};

Tool.prototype.activate = function () {
  // console.warn(this.name + " at tool activation method");
  for (var i = 0; i < this._listeners.length; i++) {
    var trigger = this._listeners[i].trigger;
    var action = this._listeners[i].action;
    this.canvas.on(trigger, action);
  }
};

// This function will be called when user tries to activate a tool that
// is already active. It can enable some special behavior.
// Implement this function in a subclass when needed.
Tool.prototype.activateAgain = function () {};

Tool.prototype.deactivate = function () {
  // console.warn(this.name + " at deactivation method");
  for (var i = 0; i < this._listeners.length; i++) {
    var trigger = this._listeners[i].trigger;
    var action = this._listeners[i].action;
    this.canvas.off(trigger);
  }
};

Tool.prototype.addEventListener = function (eventTrigger, eventHandler) {
  this._listeners.push({
    trigger: eventTrigger,
    action: eventHandler
  });
};

Tool.prototype.removeEventListener = function (trigger) {
  for (var i = 0; i < this._listeners.length; i++) {
    if (trigger == this._listeners[i].trigger){
      return this._listeners.splice(i,1);
    }
  }
};

module.exports = Tool;
