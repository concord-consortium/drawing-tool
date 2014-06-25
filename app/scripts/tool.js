/*
 * Tool "Class"
 */
var Tool = function Tool (name, selector) {
  this.name = name || "Tool";
  this.selector = selector || "";
  this.active = false;
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

Tool.prototype.activate = function() { console.warn("unimplemented activation method"); }

Tool.prototype.deactivate = function() { console.warn("unimplemented deactivation method"); }

module.exports = Tool;
