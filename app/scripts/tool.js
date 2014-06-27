/*
 * Tool "Class"
 */
function Tool (name, selector, drawTool) {
  console.info(name);

  this.name = name || "Tool";
  this.selector = selector || "";
  this.master = drawTool;
  this.canvas = drawTool.canvas;
  this.active = false;

  this.listeners = [];
}

Tool.prototype.setActive = function(active) {
  // console.log(this.name + " active? " +  this.active);
  if (this.active === active) { return active; }
  this.active = active;
  if (active === true){
    // this tool is now active
    console.log("Activating " + this.name);
    this.activate();
  }
  else{
    // this tool has been deselected
    console.log("Deactivating " + this.name);
    this.deactivate();
  }

  return active;
}

Tool.prototype.isActive = function() { return this.active; }

Tool.prototype.activate = function() {
  // console.warn(this.name + " at tool activation method");
  for (var i = 0; i < this.listeners.length; i++) {
    var trigger = this.listeners[i].trigger,
        action = this.listeners[i].action;
    this.canvas.on(trigger, action);
  }
}

Tool.prototype.deactivate = function() {
  // console.warn(this.name + " at deactivation method");
  for (var i = 0; i < this.listeners.length; i++) {
    var trigger = this.listeners[i].trigger,
        action = this.listeners[i].action;
    this.canvas.off(trigger);
  }
}

Tool.prototype.addEventListener = function(eventTrigger, eventHandler){
  // console.log("event added");
  this.listeners[this.listeners.length] = {
    trigger: eventTrigger,
    action: eventHandler
  };
  console.info(this.listeners);
}

Tool.prototype.removeEventListener = function(trigger){
  for (var i = 0; i < this.listeners.length; i++) {
    if(trigger == this.listeners[i].trigger){
      return this.listeners.splice(i,1);
    }
  }
}

module.exports = Tool;
