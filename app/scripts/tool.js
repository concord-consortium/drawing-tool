/*
 * Tool "Class"
 */
function Tool (name, selector, canvas) {
  console.info(name + " ");

  this.name = name || "Tool";
  this.selector = selector || "";
  this.canvas = canvas;
  this.active = false;

  this.listeners = {};
}

Tool.prototype.setActive = function(active) {
  console.log(this.name + " active? " +  this.active);
  if (this.active === active) { return active; }
  this.active = active;
  if (active === true){
    // this tool is now active
    console.log("Activating " + this.name);
    this.activate();
    console.log(this.name + " has been activated");
  }
  else{
    // this tool has been deselected
    console.log("Deactivating " + this.name);
    this.deactivate();
    console.log(this.name + " is no longer active");
  }

  return active;
}

Tool.prototype.isActive = function() { return this.active; }

Tool.prototype.activate = function() {
  console.warn("unimplemented activation method");
  for (var i = 0; i < this.listeners.length; i++) {
    var trigger = this.listeners[i].trigger,
        action = this.listeners[i].action;
    this.canvas.on(trigger, action);
  }
}

Tool.prototype.deactivate = function() {
  console.warn("unimplemented deactivation method");
  for (var i = 0; i < this.listeners.length; i++) {
    var trigger = this.listeners[i].trigger,
        action = this.listeners[i].action;
    this.canvas.off(trigger);
  }
}

Tool.prototype.addEventListener = function(eventTrigger, eventHandler){
  this.listeners[this.listeners.length] = {
    trigger: eventTrigger,
    action: eventHandler
  };
}

Tool.prototype.removeEventListener = function(trigger){
  for (var i = 0; i < this.listeners.length; i++) {
    if(trigger == this.listeners[i].trigger){
      return this.listeners.splice(i,1);
    }
  }
}

module.exports = Tool;
