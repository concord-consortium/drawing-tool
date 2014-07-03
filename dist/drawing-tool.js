!function(){"use strict";var t="undefined"!=typeof window?window:global;if("function"!=typeof t.require){var e={},i={},s=function(t,e){return{}.hasOwnProperty.call(t,e)},r=function(t,e){var i,s,r=[];i=/^\.\.?(\/|$)/.test(e)?[t,e].join("/").split("/"):e.split("/");for(var o=0,c=i.length;c>o;o++)s=i[o],".."===s?r.pop():"."!==s&&""!==s&&r.push(s);return r.join("/")},o=function(t){return t.split("/").slice(0,-1).join("/")},c=function(e){return function(i){var s=o(e),c=r(s,i);return t.require(c,e)}},n=function(t,e){var s={id:t,exports:{}};return i[t]=s,e(s.exports,c(t),s),s.exports},h=function(t,o){var c=r(t,".");if(null==o&&(o="/"),s(i,c))return i[c].exports;if(s(e,c))return n(c,e[c]);var h=r(c,"./index");if(s(i,h))return i[h].exports;if(s(e,h))return n(h,e[h]);throw new Error('Cannot find module "'+t+'" from "'+o+'"')},u=function(t,i){if("object"==typeof t)for(var r in t)s(t,r)&&(e[r]=t[r]);else e[t]=i},l=function(){var t=[];for(var i in e)s(e,i)&&t.push(i);return t};t.require=h,t.require.define=u,t.require.register=u,t.require.list=l,t.require.brunch=!0}}(),require.register("scripts/circle-tool",function(t,e,i){function s(t,e,i){o.call(this,t,e,i);var s=this;this.addEventListener("mouse:down",function(t){s.mouseDown(t)}),this.addEventListener("mouse:move",function(t){s.mouseMove(t)}),this.addEventListener("mouse:up",function(t){s.mouseUp(t)})}{var r=e("scripts/inherit"),o=e("scripts/shape-tool");e("scripts/util")}r(s,o),s.prototype.mouseDown=function(t){console.log("Circle down"),s.super.mouseDown.call(this,t);var e=t.e.offsetX,i=t.e.offsetY;this.curr=new fabric.Circle({top:i,left:e,radius:.1,lockUniScaling:!0,selectable:!1}),this.canvas.add(this.curr)},s.prototype.mouseMove=function(t){if(s.super.mouseMove.call(this,t),this.down!==!1){var e=t.e.offsetX,i=t.e.offsetY,r=this.curr.left,o=this.curr.top,c=e-r,n=i-o;0>c?(this.curr.originX="right",c=-c):this.curr.originX="left",0>n?(this.curr.originY="bottom",n=-n):this.curr.originY="top";var h=(n>c?c:n)/2;this.curr.set("radius",h),this.curr.set("width",2*h),this.curr.set("height",2*h),this.canvas.renderAll(!1)}},s.prototype.mouseUp=function(t){console.log("Circle up"),this.curr.radius<10?(this.canvas.remove(this.curr),this.moved=!1):("right"===this.curr.originX&&(this.curr.left=this.curr.left-this.curr.width-this.curr.strokeWidth,this.curr.originX="left"),"bottom"===this.curr.originY&&(this.curr.top=this.curr.top-this.curr.height-this.curr.strokeWidth,this.curr.originY="top")),this.curr.setCoords(),this.canvas.renderAll(!1),s.super.mouseUp.call(this,t),this.actionComplete(this.curr),this.curr=void 0},i.exports=s}),require.register("scripts/drawing-tool",function(t,e,i){function s(t){this.canvas=new fabric.Canvas(t),this.canvas.perPixelTargetFind=!0,fabric.Object.prototype.transparentCorners=!1,fabric.Object.prototype.selectable=!1,fabric.Object.prototype.minWidth=15,fabric.Object.prototype.minHeight=15,fabric.Object.prototype.perPixelTargetFind=!0,fabric.Object.prototype.strokeWidth=10,fabric.Object.prototype.stroke="rgba(100,200,200,.75)",fabric.Object.prototype.fill="",fabric.Line.prototype.hasControls=!1,fabric.Line.prototype.hasBorders=!1,this.tools={};var e=(new r("Selection Tool","select",this),new o("Line Tool","line",this),new c("Rectangle Tool","rect",this),new n("Ellipse Tool","ellipse",this),new h("Square Tool","square",this),new u("Circle Tool","circle",this),this);$(".btn").click(function(){var t=$(this).find("input").val();e._toolButtonClicked(t)}),l(this.canvas),this.chooseTool("select"),this.canvas._selectedItem=void 0}var r=(e("scripts/tool"),e("scripts/shape-tool"),e("scripts/select-tool")),o=e("scripts/line-tool"),c=e("scripts/rect-tool"),n=e("scripts/ellipse-tool"),h=e("scripts/square-tool"),u=e("scripts/circle-tool"),l=(e("scripts/util"),e("scripts/rescale-2-resize"));s.prototype.chooseTool=function(t){$("#"+t).click()},s.prototype.changeOutOfTool=function(){this.chooseTool("select")},s.prototype.check=function(){for(var t=this.canvas.getObjects(),e=0;e<t.length;e++)console.log(t[e])},s.prototype._toolButtonClicked=function(t){if(void 0!==this.currentTool&&this.currentTool.selector===t)return console.log(this.currentTool.name+" is already the current tool"),void this.currentTool.activateAgain();var e=this.tools[t];return void 0===e?void console.warn('Warning! Could not find tool with selector "'+t+'"\nExiting tool chooser.'):(void 0!==this.currentTool&&this.currentTool.setActive(!1),e.setActive(!0),this.currentTool=e,void this.canvas.renderAll(!1))},i.exports=s}),require.register("scripts/ellipse-tool",function(t,e,i){function s(t,e,i){o.call(this,t,e,i);var s=this;this.addEventListener("mouse:down",function(t){s.mouseDown(t)}),this.addEventListener("mouse:move",function(t){s.mouseMove(t)}),this.addEventListener("mouse:up",function(t){s.mouseUp(t)})}var r=e("scripts/inherit"),o=e("scripts/shape-tool"),c=e("scripts/util");r(s,o),s.prototype.mouseDown=function(t){console.log("ellipse down"),s.super.mouseDown.call(this,t);var e=t.e.offsetX,i=t.e.offsetY;this.curr=new fabric.Ellipse({top:i,left:e,rx:.1,ry:.1,selectable:!1}),this.canvas.add(this.curr)},s.prototype.mouseMove=function(t){if(s.super.mouseMove.call(this,t),this.down!==!1){var e=t.e.offsetX,i=t.e.offsetY,r=this.curr.left,o=this.curr.top,c=e-r,n=i-o;0>c?(this.curr.originX="right",c=-c):this.curr.originX="left",0>n?(this.curr.originY="bottom",n=-n):this.curr.originY="top",this.curr.set("rx",c/2),this.curr.set("ry",n/2),this.curr.set("width",c),this.curr.set("height",n),this.canvas.renderAll(!1)}},s.prototype.mouseUp=function(t){console.log("ellipse up");var e=this.curr.width,i=this.curr.height;c.dist(e,i)<10?(this.canvas.remove(this.curr),this.moved=!1):("right"===this.curr.originX&&(this.curr.left=this.curr.left-this.curr.width-this.curr.strokeWidth,this.curr.originX="left"),"bottom"===this.curr.originY&&(this.curr.top=this.curr.top-this.curr.height-this.curr.strokeWidth,this.curr.originY="top")),this.curr.setCoords(),this.canvas.renderAll(!1),s.super.mouseUp.call(this,t),this.actionComplete(this.curr),this.curr=void 0},i.exports=s}),require.register("scripts/inherit",function(t,e,i){i.exports=function(t,e){t.prototype=Object.create(e.prototype),t.prototype.constructor=t,t.super=e.prototype}}),require.register("scripts/line-tool",function(t,e,i){function s(t,e,i){o.call(this,t,e,i);var r=this;this.addEventListener("mouse:down",function(t){r.mouseDown(t)}),this.addEventListener("mouse:move",function(t){r.mouseMove(t)}),this.addEventListener("mouse:up",function(t){r.mouseUp(t)}),fabric.Line.prototype.is=function(t){return this===t||this.ctp[0]===t||this.ctp[1]===t},this.canvas.on.call(this.canvas,"object:selected",function(t){void 0!==this._selectedObj&&"line"===this._selectedObj.type?this._selectedObj.is(t.target)||(s.objectDeselected.call(this._selectedObj),this._selectedObj=t.target):this._selectedObj=t.target}),this.canvas.on("selection:cleared",function(){this._selectedObj&&"line"===this._selectedObj.type&&s.objectDeselected.call(this._selectedObj),this._selectedObj=void 0})}var r=e("scripts/inherit"),o=e("scripts/shape-tool"),c=e("scripts/util");r(s,o),s.prototype.mouseDown=function(t){console.log("down"),s.super.mouseDown.call(this,t);var e=t.e.offsetX,i=t.e.offsetY;this.curr=new fabric.Line([e,i,e,i],{selectable:!1}),this.canvas.add(this.curr)},s.prototype.mouseMove=function(t){if(s.super.mouseMove.call(this,t),this.down!==!1){var e=t.e.offsetX,i=t.e.offsetY;this.curr.set("x2",e),this.curr.set("y2",i),this.canvas.renderAll(!1)}},s.prototype.mouseUp=function(t){console.log("line up"),s.super.mouseUp.call(this,t);var e=this.curr.get("x1"),i=this.curr.get("y1"),r=this.curr.get("x2"),o=this.curr.get("y2");c.dist(r-e,o-i)>10?(this.curr.setCoords(),console.log("new line constructed")):(this.canvas.remove(this.curr),this.exit()),this.curr.set("prevTop",this.curr.get("top")),this.curr.set("prevLeft",this.curr.get("left")),this.curr.set("selectable",!1);var n=fabric.Line.prototype.cornerSize;this.curr.ctp=[this._makePoint(e,i,n,this.curr,0),this._makePoint(r,o,n,this.curr,1)],this.curr.on("selected",s.objectSelected),this.curr.on("moving",s.objectMoved),this.canvas.renderAll(!1),this.actionComplete(this.curr),this.curr=void 0},s.prototype._makePoint=function(t,e,i,r,o){var c=new fabric.Rect({left:t,top:e,width:i,height:i,strokeWidth:0,fill:"rgba(102,153,255,0.5)",visible:!1,selectable:!0,hasControls:!1,hasBorder:!1,line:r,id:o});return r.canvas.add(c),c.on("moving",s.updateLine),c},s.objectSelected=function(t){var e=this;s.updateControlPoints.call(e,t),this.ctp[0].visible=!0,this.ctp[1].visible=!0,this.canvas.renderAll(!1)},s.objectDeselected=function(){this.ctp[0].visible=!1,this.ctp[1].visible=!1,this.canvas.renderAll(!1)},s.objectMoved=function(t){var e=this.left-this.prevLeft,i=this.top-this.prevTop;this.set("x1",e+this.x1),this.set("y1",i+this.y1),this.set("x2",e+this.x2),this.set("y2",i+this.y2),this.prevLeft=this.left,this.prevTop=this.top;var r=this;s.updateControlPoints.call(r,t)},s.updateControlPoints=function(){this.ctp[0].set("top",this.y1),this.ctp[0].set("left",this.x1),this.ctp[1].set("top",this.y2),this.ctp[1].set("left",this.x2),this.ctp[0].setCoords(),this.ctp[1].setCoords()},s.updateLine=function(){var t=this.line;t.set("x"+(this.id+1),this.left),t.set("y"+(this.id+1),this.top),t.setCoords(),t.prevLeft=t.left,t.prevTop=t.top,t.canvas.renderAll(!1)},i.exports=s}),require.register("scripts/rect-tool",function(t,e,i){function s(t,e,i){o.call(this,t,e,i);var s=this;this.addEventListener("mouse:down",function(t){s.mouseDown(t)}),this.addEventListener("mouse:move",function(t){s.mouseMove(t)}),this.addEventListener("mouse:up",function(t){s.mouseUp(t)})}var r=e("scripts/inherit"),o=e("scripts/shape-tool"),c=e("scripts/util");r(s,o),s.prototype.mouseDown=function(t){console.log("down"),s.super.mouseDown.call(this,t);var e=t.e.offsetX,i=t.e.offsetY;this.curr=new fabric.Rect({top:i,left:e,width:0,height:0}),this.canvas.add(this.curr)},s.prototype.mouseMove=function(t){if(s.super.mouseMove.call(this,t),this.down!==!1){var e=t.e.offsetX,i=t.e.offsetY,r=this.curr.left,o=this.curr.top;this.curr.width=e-r,this.curr.height=i-o,this.canvas.renderAll(!1)}},s.prototype.mouseUp=function(t){console.log("rect up"),s.super.mouseUp.call(this,t),c.dist(this.curr.width,this.curr.height)>3?(this.curr.width<0&&(this.curr.left=this.curr.left+this.curr.width,this.curr.width=-this.curr.width),this.curr.height<0&&(this.curr.top=this.curr.top+this.curr.height,this.curr.height=-this.curr.height),this.curr.setCoords()):this.exit(),this.canvas.renderAll(!1),this.actionComplete(this.curr),this.curr=void 0},i.exports=s}),require.register("scripts/rescale-2-resize",function(t,e,i){function s(t){t.width=t.width*t.scaleX+t.strokeWidth*(t.scaleX-1),t.height=t.height*t.scaleY+t.strokeWidth*(t.scaleY-1)}function r(t){s(t),1!==t.scaleX?t.height=t.width:t.width=t.height}var o={rect:function(t){s(t)},ellipse:function(t){s(t),t.rx=Math.abs(t.width/2),t.ry=Math.abs(t.height/2)},circle:function(t){r(t),t.radius=Math.abs(t.width/2)},square:function(t){r(t)}};i.exports=function(t){t.on("object:scaling",function(t){var e=t.target,i=e.dtType||e.type;void 0!==o[i]&&(o[i](e),e.scaleX=1,e.scaleY=1)})}}),require.register("scripts/select-tool",function(t,e,i){function s(t,e,i){o.call(this,t,e,i)}var r=e("scripts/inherit"),o=e("scripts/tool");r(s,o),s.prototype.activate=function(){this.setSelectable(!0)},s.prototype.deactivate=function(){this.setSelectable(!1),this.canvas.deactivateAll()},s.prototype.setSelectable=function(t){this.canvas.selection=t;for(var e=this.canvas.getObjects(),i=e.length-1;i>=0;i--)e[i].selectable=t},i.exports=s}),require.register("scripts/shape-tool",function(t,e,i){function s(t,e,i){o.call(this,t,e,i),this.moved=!1,this.down=!1,this._firstAction=!1}var r=e("scripts/inherit"),o=e("scripts/tool");r(s,o),s.prototype.activate=function(){s.super.activate.call(this),this.moved=!1,this.down=!1,this._setFirstActionMode(),this.canvas.defaultCursor="crosshair"},s.prototype.activateAgain=function(){this._setFirstActionMode()},s.prototype.exit=function(){console.info("changing out of "+this.name),this.down=!1,this.moved=!1,this.master.changeOutOfTool(this.selector),this.canvas.defaultCursor="default"},s.prototype.mouseDown=function(t){this.down=!0,this.moved=!1,this._firstAction===!1&&void 0!==t.target&&this.exit()},s.prototype.mouseMove=function(){this.moved===!1&&this.down===!0&&(this.moved=!0)},s.prototype.mouseUp=function(){this.down=!1,this.moved===!1&&this.exit()},s.prototype.actionComplete=function(t){this._firstAction&&(this._firstAction=!1,this._setAllObjectsSelectable(!0)),t&&(t.selectable=!0)},s.prototype._setFirstActionMode=function(){this._firstAction=!0,this._setAllObjectsSelectable(!1)},s.prototype._setAllObjectsSelectable=function(t){for(var e=this.canvas.getObjects(),i=e.length-1;i>=0;i--)e[i].selectable=t},i.exports=s}),require.register("scripts/square-tool",function(t,e,i){function s(t,e,i){o.call(this,t,e,i);var s=this;this.addEventListener("mouse:down",function(t){s.mouseDown(t)}),this.addEventListener("mouse:move",function(t){s.mouseMove(t)}),this.addEventListener("mouse:up",function(t){s.mouseUp(t)})}var r=e("scripts/inherit"),o=e("scripts/shape-tool"),c=e("scripts/util");r(s,o),s.prototype.mouseDown=function(t){console.log("down"),s.super.mouseDown.call(this,t);var e=t.e.offsetX,i=t.e.offsetY;this.curr=new fabric.Rect({top:i,left:e,width:0,height:0,lockUniScaling:!0}),this.canvas.add(this.curr)},s.prototype.mouseMove=function(t){if(s.super.mouseMove.call(this,t),this.down!==!1){var e=t.e.offsetX-this.curr.left,i=t.e.offsetY-this.curr.top,r=Math.abs(Math.abs(e)>Math.abs(i)?e:i);this.curr.width=r,0>e&&(this.curr.width*=-1),this.curr.height=r,0>i&&(this.curr.height*=-1),this.canvas.renderAll(!1)}},s.prototype.mouseUp=function(t){console.log("rect up"),s.super.mouseUp.call(this,t),c.dist(this.curr.width,this.curr.height)>3?(this.curr.width<0&&(this.curr.left=this.curr.left+this.curr.width,this.curr.width=-this.curr.width),this.curr.height<0&&(this.curr.top=this.curr.top+this.curr.height,this.curr.height=-this.curr.height),this.curr.setCoords()):this.exit(),this.canvas.renderAll(!1),this.actionComplete(this.curr),this.curr=void 0},i.exports=s}),require.register("scripts/tool",function(t,e,i){function s(t,e,i){console.info(t),this.name=t||"Tool",this.selector=e||"",this.master=i,this.canvas=i.canvas,this.active=!1,this.master.tools[e]=this,this._listeners=[]}s.prototype.setActive=function(t){return this.active===t?t:(this.active=t,t===!0?(console.log("Activating "+this.name),this.activate()):(console.log("Deactivating "+this.name),this.deactivate()),t)},s.prototype.activate=function(){for(var t=0;t<this._listeners.length;t++){var e=this._listeners[t].trigger,i=this._listeners[t].action;this.canvas.on(e,i)}},s.prototype.activateAgain=function(){},s.prototype.deactivate=function(){for(var t=0;t<this._listeners.length;t++){{var e=this._listeners[t].trigger;this._listeners[t].action}this.canvas.off(e)}},s.prototype.addEventListener=function(t,e){this._listeners.push({trigger:t,action:e})},s.prototype.removeEventListener=function(t){for(var e=0;e<this._listeners.length;e++)if(t==this._listeners[e].trigger)return this._listeners.splice(e,1)},i.exports=s}),require.register("scripts/util",function(t,e,i){i.exports={dist:function(t,e){var i=Math.pow(t,2),s=Math.pow(e,2);return Math.sqrt(i+s)}}}),window.DrawingTool=require("scripts/drawing-tool");