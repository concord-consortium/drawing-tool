!function(){"use strict";var t="undefined"!=typeof window?window:global;if("function"!=typeof t.require){var e={},i={},s=function(t,e){return{}.hasOwnProperty.call(t,e)},o=function(t,e){var i,s,o=[];i=/^\.\.?(\/|$)/.test(e)?[t,e].join("/").split("/"):e.split("/");for(var r=0,n=i.length;n>r;r++)s=i[r],".."===s?o.pop():"."!==s&&""!==s&&o.push(s);return o.join("/")},r=function(t){return t.split("/").slice(0,-1).join("/")},n=function(e){return function(i){var s=r(e),n=o(s,i);return t.require(n,e)}},c=function(t,e){var s={id:t,exports:{}};return i[t]=s,e(s.exports,n(t),s),s.exports},h=function(t,r){var n=o(t,".");if(null==r&&(r="/"),s(i,n))return i[n].exports;if(s(e,n))return c(n,e[n]);var h=o(n,"./index");if(s(i,h))return i[h].exports;if(s(e,h))return c(h,e[h]);throw new Error('Cannot find module "'+t+'" from "'+r+'"')},a=function(t,i){if("object"==typeof t)for(var o in t)s(t,o)&&(e[o]=t[o]);else e[t]=i},l=function(){var t=[];for(var i in e)s(e,i)&&t.push(i);return t};t.require=h,t.require.define=a,t.require.register=a,t.require.list=l,t.require.brunch=!0}}(),require.register("scripts/drawing-tool",function(t,e,i){function s(t,e){this.options=$.extend(!0,{},v,e),this._initUI(t),this._initFabricJS(),this.tools={};var i=new o("Selection Tool","select",this),s=(new r("Line Tool","line",this),new n("Rectangle Tool","rect",this),new c("Ellipse Tool","ellipse",this),new h("Square Tool","square",this),new a("Circle Tool","circle",this),new l("Free Draw Tool","free",this),new u("Delete Tool","trash",this));i.deleteTool=s;var d=this;$(".dt-btn").click(function(){var t=$(this).attr("id");d._toolButtonClicked(t)}),p(this.canvas),this.chooseTool("select")}var o=(e("scripts/tool"),e("scripts/tools/shape-tool"),e("scripts/tools/select-tool")),r=e("scripts/tools/line-tool"),n=e("scripts/tools/rect-tool"),c=e("scripts/tools/ellipse-tool"),h=e("scripts/tools/square-tool"),a=e("scripts/tools/circle-tool"),l=e("scripts/tools/free-draw"),u=e("scripts/tools/delete-tool"),p=(e("scripts/util"),e("scripts/rescale-2-resize")),d="dt-drawing-area",v={width:700,height:500};s.prototype.clear=function(t){this.canvas.clear(),t&&(this.canvas.setBackgroundImage(null),this._backgroundImage=null),this.canvas.renderAll()},s.prototype.save=function(){return JSON.stringify(this.canvas.toJSON())},s.prototype.load=function(t){var e=JSON.parse(t),i=e.backgroundImage;if(delete e.backgroundImage,this.canvas.loadFromJSON(e),void 0!==i){var s=i.src;delete i.src,this._setBackgroundImage(s,i)}this.canvas.renderAll()},s.prototype.setStrokeColor=function(t){fabric.Object.prototype.stroke=t,this.canvas.freeDrawingBrush.color=t,fabric.Image.prototype.stroke=null},s.prototype.setStrokeWidth=function(t){fabric.Object.prototype.strokeWidth=t,this.canvas.freeDrawingBrush.width=t},s.prototype.setFill=function(t){fabric.Object.prototype.fill=t},s.prototype.setBackgroundImage=function(t){this._setBackgroundImage(t)},s.prototype.resizeBackgroundToCanvas=function(){this._backgroundImage&&(this._backgroundImage.set({width:this.canvas.width,height:this.canvas.height}),this.canvas.renderAll())},s.prototype.resizeCanvasToBackground=function(){this._backgroundImage&&(this.canvas.setDimensions({width:this._backgroundImage.width,height:this._backgroundImage.height}),this._backgroundImage.set({top:this.canvas.height/2,left:this.canvas.width/2}),this.canvas.renderAll())},s.prototype.chooseTool=function(t){$("#"+t).click()},s.prototype.changeOutOfTool=function(){this.chooseTool("select")},s.prototype.check=function(){for(var t=this.canvas.getObjects(),e=0;e<t.length;e++)console.log(t[e])},s.prototype._setBackgroundImage=function(t,e){e=e||{originX:"center",originY:"center",top:this.canvas.height/2,left:this.canvas.width/2};var i=this;fabric.Image.fromURL(t,function(t){t.set(e),i.canvas.setBackgroundImage(t,i.canvas.renderAll.bind(i.canvas)),i._backgroundImage=t})},s.prototype._initUI=function(t){$(t).empty(),this.$element=$('<div class="dt-container">').appendTo(t),this.$tools=$('<div class="dt-tools" data-toggle="buttons">').appendTo(this.$element);var e=$('<div class="dt-canvas-container">').attr("tabindex",0).appendTo(this.$element);$("<canvas>").attr("id",d).attr("width",this.options.width+"px").attr("height",this.options.height+"px").appendTo(e)},s.prototype._initFabricJS=function(){this.canvas=new fabric.Canvas(d),this.canvas.perPixelTargetFind=!0,this.setStrokeWidth(10),this.setStrokeColor("rgba(100,200,200,.75)"),this.setFill(""),fabric.Object.prototype.transparentCorners=!1,fabric.Object.prototype.perPixelTargetFind=!0},s.prototype._toolButtonClicked=function(t){if(void 0!==this.currentTool&&this.currentTool.selector===t)return console.log(this.currentTool.name+" is already the current tool"),void this.currentTool.activateAgain();var e=this.tools[t];return void 0===e?void console.warn('Warning! Could not find tool with selector "'+t+'"\nExiting tool chooser.'):e.singleUse===!0?void e.use():(void 0!==this.currentTool&&this.currentTool.setActive(!1),this.currentTool=e,e.setActive(!0),void this.canvas.renderAll())},i.exports=s}),require.register("scripts/inherit",function(t,e,i){i.exports=function(t,e){t.prototype=Object.create(e.prototype),t.prototype.constructor=t,t.super=e.prototype}}),require.register("scripts/rescale-2-resize",function(t,e,i){function s(t){t.width=t.width*t.scaleX+t.strokeWidth*(t.scaleX-1),t.height=t.height*t.scaleY+t.strokeWidth*(t.scaleY-1)}function o(t){s(t),1!==t.scaleX?t.height=t.width:t.width=t.height}var r={rect:function(t){s(t)},ellipse:function(t){s(t),t.rx=Math.abs(t.width/2),t.ry=Math.abs(t.height/2)},circle:function(t){o(t),t.radius=Math.abs(t.width/2)},square:function(t){o(t)}};i.exports=function(t){t.on("object:scaling",function(t){var e=t.target,i=e.dtType||e.type;void 0!==r[i]&&(r[i](e),e.scaleX=1,e.scaleY=1)}),fabric.Group.prototype.lockUniScaling=!0,t.on("before:selection:cleared",function(t){console.log(this);var e=t.target;if("group"===e.type&&1!==e.scaleX)for(var i,s=e.scaleX,o=e.getObjects(),n=0;n<o.length;n++)void 0!==r[o[n].type]&&(i=o[n].strokeWidth,o[n].strokeWidth=0,o[n].scaleX=s,o[n].scaleY=s,r[o[n].type](o[n]),o[n].strokeWidth=i*s,o[n].scaleX=1/s,o[n].scaleY=1/s)})}}),require.register("scripts/tool",function(t,e,i){function s(t,e,i){console.info(t),this.name=t||"Tool",this.selector=e||"",this.master=i,this.canvas=i.canvas,this.active=!1,this.singleUse=!1,this.master.tools[e]=this,this._listeners=[],this.initUI()}s.prototype.setActive=function(t){return this.singleUse?void console.warn("This is a single use tool. It was not activated."):this.active===t?t:(this.active=t,t===!0?(console.log("Activating "+this.name),this.activate()):(console.log("Deactivating "+this.name),this.deactivate()),t)},s.prototype.activate=function(){for(var t=0;t<this._listeners.length;t++){var e=this._listeners[t].trigger,i=this._listeners[t].action;this.canvas.on(e,i)}this.$element.addClass("dt-active")},s.prototype.activateAgain=function(){},s.prototype.use=function(){},s.prototype.deactivate=function(){for(var t=0;t<this._listeners.length;t++){{var e=this._listeners[t].trigger;this._listeners[t].action}this.canvas.off(e)}this.$element.removeClass("dt-active")},s.prototype.addEventListener=function(t,e){this._listeners.push({trigger:t,action:e})},s.prototype.removeEventListener=function(t){for(var e=0;e<this._listeners.length;e++)if(t==this._listeners[e].trigger)return this._listeners.splice(e,1)},s.prototype.initUI=function(){this.$element=$('<div class="dt-btn">').attr("id",this.selector).appendTo(this.master.$tools),$("<span>").appendTo(this.$element)},s.prototype.setLabel=function(t){this.$element.find("span").text(t)},i.exports=s}),require.register("scripts/tools/circle-tool",function(t,e,i){function s(t,e,i){r.call(this,t,e,i);var s=this;this.addEventListener("mouse:down",function(t){s.mouseDown(t)}),this.addEventListener("mouse:move",function(t){s.mouseMove(t)}),this.addEventListener("mouse:up",function(t){s.mouseUp(t)}),this.setLabel("C")}var o=e("scripts/inherit"),r=e("scripts/tools/shape-tool"),n=e("scripts/util");o(s,r),s.prototype.mouseDown=function(t){if(console.log("Circle down"),s.super.mouseDown.call(this,t),this.active){var e=n.getLoc(t.e),i=e.x,o=e.y;this.curr=new fabric.Circle({top:o,left:i,radius:.1,lockUniScaling:!0,selectable:!1}),this.canvas.add(this.curr)}},s.prototype.mouseMove=function(t){if(s.super.mouseMove.call(this,t),this.down!==!1){var e=n.getLoc(t.e),i=e.x,o=e.y,r=this.curr.left,c=this.curr.top,h=i-r,a=o-c;0>h?(this.curr.originX="right",h=-h):this.curr.originX="left",0>a?(this.curr.originY="bottom",a=-a):this.curr.originY="top";var l=(a>h?h:a)/2;this.curr.set("radius",l),this.curr.set("width",2*l),this.curr.set("height",2*l),this.canvas.renderAll(!1)}},s.prototype.mouseUp=function(t){console.log("Circle up"),s.super.mouseUp.call(this,t),this.active&&("right"===this.curr.originX&&(this.curr.left=this.curr.left-this.curr.width-this.curr.strokeWidth,this.curr.originX="left"),"bottom"===this.curr.originY&&(this.curr.top=this.curr.top-this.curr.height-this.curr.strokeWidth,this.curr.originY="top"),this.curr.setCoords(),this.canvas.renderAll(!1),this.actionComplete(this.curr),this.curr=void 0)},i.exports=s}),require.register("scripts/tools/delete-tool",function(t,e,i){function s(t,e,i){r.call(this,t,e,i),this.singleUse=!0;var s=this;$(".dt-canvas-container").keydown(function(t){8===t.keyCode&&(t.preventDefault(),s._delete())}),this.canvas.on("object:selected",function(){s.show()}),this.canvas.on("selection:cleared",function(){s.hide()})}var o=e("scripts/inherit"),r=e("scripts/tool");o(s,r),s.prototype.use=function(){this._delete()},s.prototype._delete=function(){var t=this.canvas;t.getActiveObject()?t.remove(t.getActiveObject()):t.getActiveGroup()&&(t.getActiveGroup().forEachObject(function(e){t.remove(e)}),t.discardActiveGroup().renderAll())},s.prototype.initUI=function(){this.$element=$('<div class="dt-btn">').attr("id",this.selector).appendTo(this.master.$tools).hide(),$("<span>").text("Tr").appendTo(this.$element)},s.prototype.show=function(){this.$element.show()},s.prototype.hide=function(){this.$element.hide()},i.exports=s}),require.register("scripts/tools/ellipse-tool",function(t,e,i){function s(t,e,i){r.call(this,t,e,i);var s=this;this.addEventListener("mouse:down",function(t){s.mouseDown(t)}),this.addEventListener("mouse:move",function(t){s.mouseMove(t)}),this.addEventListener("mouse:up",function(t){s.mouseUp(t)}),this.setLabel("E")}var o=e("scripts/inherit"),r=e("scripts/tools/shape-tool"),n=e("scripts/util");o(s,r),s.prototype.mouseDown=function(t){if(console.log("ellipse down"),s.super.mouseDown.call(this,t),this.active){var e=n.getLoc(t.e),i=e.x,o=e.y;this.curr=new fabric.Ellipse({top:o,left:i,rx:.1,ry:.1,selectable:!1}),this.canvas.add(this.curr)}},s.prototype.mouseMove=function(t){if(s.super.mouseMove.call(this,t),this.down!==!1){var e=n.getLoc(t.e),i=e.x,o=e.y,r=this.curr.left,c=this.curr.top,h=i-r,a=o-c;0>h?(this.curr.originX="right",h=-h):this.curr.originX="left",0>a?(this.curr.originY="bottom",a=-a):this.curr.originY="top",this.curr.set("rx",h/2),this.curr.set("ry",a/2),this.curr.set("width",h),this.curr.set("height",a),this.canvas.renderAll(!1)}},s.prototype.mouseUp=function(t){if(console.log("ellipse up"),s.super.mouseUp.call(this,t),this.active){{this.curr.width,this.curr.height}"right"===this.curr.originX&&(this.curr.left=this.curr.left-this.curr.width-this.curr.strokeWidth,this.curr.originX="left"),"bottom"===this.curr.originY&&(this.curr.top=this.curr.top-this.curr.height-this.curr.strokeWidth,this.curr.originY="top"),this.curr.setCoords(),this.canvas.renderAll(!1),this.actionComplete(this.curr),this.curr=void 0}},i.exports=s}),require.register("scripts/tools/free-draw",function(t,e,i){function s(t,e,i){r.call(this,t,e,i);var s=this;this.addEventListener("mouse:down",function(t){s.mouseDown(t)}),this.addEventListener("mouse:up",function(t){s.mouseUp(t)}),this.setLabel("F")}var o=e("scripts/inherit"),r=e("scripts/tools/shape-tool");o(s,r),s.prototype.mouseDown=function(t){s.super.mouseDown.call(this,t),this.active&&(this.canvas.isDrawingMode||(this.canvas.isDrawingMode=!0,this.canvas._onMouseDownInDrawingMode(t.e)))},s.prototype.mouseUp=function(t){s.super.mouseUp.call(this,t),this._locked||(this.canvas.isDrawingMode=!1);var e=this.canvas.getObjects(),i=e[e.length-1];this.active?this.actionComplete(i):this.canvas.remove(i)},s.prototype.deactivate=function(){s.super.deactivate.call(this),this.canvas.isDrawingMode=!1},i.exports=s}),require.register("scripts/tools/line-tool",function(t,e,i){function s(t,e,i){r.call(this,t,e,i);var o=this;this.addEventListener("mouse:down",function(t){o.mouseDown(t)}),this.addEventListener("mouse:move",function(t){o.mouseMove(t)}),this.addEventListener("mouse:up",function(t){o.mouseUp(t)}),this.setLabel("L"),fabric.Line.prototype.hasControls=!1,fabric.Line.prototype.hasBorders=!1,this._selectedObj,fabric.Line.prototype.is=function(t){return this===t||this.ctp[0]===t||this.ctp[1]===t},this.canvas.on.call(this.canvas,"object:selected",function(t){void 0!==this._selectedObj&&"line"===this._selectedObj.type?this._selectedObj.is(t.target)||(s.objectDeselected.call(this._selectedObj),this._selectedObj=t.target):this._selectedObj=t.target}),this.canvas.on("selection:cleared",function(){this._selectedObj&&"line"===this._selectedObj.type&&s.objectDeselected.call(this._selectedObj),this._selectedObj=void 0})}var o=e("scripts/inherit"),r=e("scripts/tools/shape-tool"),n=e("scripts/util"),c="#bcd2ff";o(s,r),s.prototype.mouseDown=function(t){if(console.log("down"),s.super.mouseDown.call(this,t),this.active){var e=n.getLoc(t.e),i=e.x,o=e.y;this.curr=new fabric.Line([i,o,i,o],{selectable:!1}),this.canvas.add(this.curr)}},s.prototype.mouseMove=function(t){if(s.super.mouseMove.call(this,t),this.down!==!1){var e=n.getLoc(t.e),i=e.x,o=e.y;this.curr.set("x2",i),this.curr.set("y2",o),this.canvas.renderAll(!1)}},s.prototype.mouseUp=function(t){if(console.log("line up"),s.super.mouseUp.call(this,t),this.active){var e=this.curr.get("x1"),i=this.curr.get("y1"),o=this.curr.get("x2"),r=this.curr.get("y2");this.curr.setCoords(),console.log("new line constructed"),this.curr.set("prevTop",this.curr.get("top")),this.curr.set("prevLeft",this.curr.get("left")),this.curr.set("selectable",!1);var n=fabric.Line.prototype.cornerSize;this.curr.ctp=[this._makePoint(e,i,n,this.curr,0),this._makePoint(o,r,n,this.curr,1)],this.curr.on("selected",s.objectSelected),this.curr.on("moving",s.objectMoved),this.curr.on("removed",s.lineDeleted),this.canvas.renderAll(!1),this.actionComplete(this.curr),this.curr=void 0}},s.prototype._makePoint=function(t,e,i,o,r){var n=new fabric.Rect({left:t,top:e,width:i,height:i,strokeWidth:0,stroke:c,fill:c,visible:!1,hasControls:!1,hasBorders:!1,line:o,id:r});return o.canvas.add(n),n.on("moving",s.updateLine),n.on("removed",s.pointDeleted),n},s.objectSelected=function(t){var e=this;s.updateControlPoints.call(e,t),this.ctp[0].visible=!0,this.ctp[1].visible=!0,this.canvas.renderAll(!1)},s.objectDeselected=function(){this.ctp[0].visible=!1,this.ctp[1].visible=!1,this.canvas.renderAll(!1)},s.objectMoved=function(t){var e=this.left-this.prevLeft,i=this.top-this.prevTop;this.set("x1",e+this.x1),this.set("y1",i+this.y1),this.set("x2",e+this.x2),this.set("y2",i+this.y2),this.prevLeft=this.left,this.prevTop=this.top;var o=this;s.updateControlPoints.call(o,t)},s.updateControlPoints=function(){this.ctp[0].set("top",this.y1),this.ctp[0].set("left",this.x1),this.ctp[1].set("top",this.y2),this.ctp[1].set("left",this.x2),this.ctp[0].setCoords(),this.ctp[1].setCoords()},s.updateLine=function(){var t=this.line;t.set("x"+(this.id+1),this.left),t.set("y"+(this.id+1),this.top),t.setCoords(),t.prevLeft=t.left,t.prevTop=t.top,t.canvas.renderAll(!1)},s.pointDeleted=function(){var t=this.line;t.canvas.remove(t.ctp[0]!==this?t.ctp[0]:t.ctp[1]),t.canvas.remove(t)},s.lineDeleted=function(){this.canvas.remove(this.ctp[0])},i.exports=s}),require.register("scripts/tools/rect-tool",function(t,e,i){function s(t,e,i){r.call(this,t,e,i);var s=this;this.addEventListener("mouse:down",function(t){s.mouseDown(t)}),this.addEventListener("mouse:move",function(t){s.mouseMove(t)}),this.addEventListener("mouse:up",function(t){s.mouseUp(t)}),this.setLabel("R")}var o=e("scripts/inherit"),r=e("scripts/tools/shape-tool"),n=e("scripts/util");o(s,r),s.prototype.mouseDown=function(t){if(console.log("down"),s.super.mouseDown.call(this,t),this.active){var e=n.getLoc(t.e),i=e.x,o=e.y;this.curr=new fabric.Rect({top:o,left:i,width:0,height:0,selectable:!1}),this.canvas.add(this.curr)}},s.prototype.mouseMove=function(t){if(s.super.mouseMove.call(this,t),this.down!==!1){var e=n.getLoc(t.e),i=e.x,o=e.y,r=this.curr.left,c=this.curr.top;this.curr.width=i-r,this.curr.height=o-c,this.canvas.renderAll(!1)}},s.prototype.mouseUp=function(t){console.log("rect up"),s.super.mouseUp.call(this,t),this.active&&(this.curr.width<0&&(this.curr.left=this.curr.left+this.curr.width,this.curr.width=-this.curr.width),this.curr.height<0&&(this.curr.top=this.curr.top+this.curr.height,this.curr.height=-this.curr.height),this.curr.setCoords(),this.canvas.renderAll(!1),this.actionComplete(this.curr),this.curr=void 0)},i.exports=s}),require.register("scripts/tools/select-tool",function(t,e,i){function s(t,e,i){r.call(this,t,e,i),this.setLabel("S")}var o=e("scripts/inherit"),r=e("scripts/tool");o(s,r),s.prototype.activate=function(){s.super.activate.call(this),this.setSelectable(!0)},s.prototype.deactivate=function(){s.super.deactivate.call(this),this.setSelectable(!1),this.canvas.deactivateAllWithDispatch()},s.prototype.setSelectable=function(t){this.canvas.selection=t;for(var e=this.canvas.getObjects(),i=e.length-1;i>=0;i--)e[i].selectable=t},i.exports=s}),require.register("scripts/tools/shape-tool",function(t,e,i){function s(t,e,i){r.call(this,t,e,i),this.down=!1,this._firstAction=!1,this._locked=!1,this.curr=void 0}var o=e("scripts/inherit"),r=e("scripts/tool"),n=e("scripts/util");o(s,r),s.prototype.minimumSize=10,s.prototype.activate=function(){s.super.activate.call(this),this.down=!1,this._setFirstActionMode(),this.canvas.defaultCursor="crosshair"},s.prototype.activateAgain=function(){this._setFirstActionMode(),this._locked=!0,$("#"+this.selector).addClass("dt-locked")},s.prototype.deactivate=function(){s.super.deactivate.call(this),this.unlock()},s.prototype.unlock=function(){$("#"+this.selector).removeClass("dt-locked"),this._locked=!1},s.prototype.exit=function(){this.curr&&this.canvas.remove(this.curr),this._locked||(console.info("changing out of "+this.name),this.down=!1,this.master.changeOutOfTool(this.selector),this.canvas.defaultCursor="default")},s.prototype.mouseDown=function(t){this.down=!0,this._firstAction===!1&&void 0!==t.target&&this.exit();var e=n.getLoc(t.e);this.__startX=e.x,this.__startY=e.y},s.prototype.mouseMove=function(){},s.prototype.mouseUp=function(t){this.down=!1;var e=n.getLoc(t.e);n.dist(this.__startX-e.x,this.__startY-e.y)<this.minimumSize&&this.exit()},s.prototype.actionComplete=function(t){this._locked||(this._firstAction&&(this._firstAction=!1,this._setAllObjectsSelectable(!0)),t&&(t.selectable=!0))},s.prototype._setFirstActionMode=function(){this._firstAction=!0,this._setAllObjectsSelectable(!1)},s.prototype._setAllObjectsSelectable=function(t){for(var e=this.canvas.getObjects(),i=e.length-1;i>=0;i--)e[i].selectable=t},i.exports=s}),require.register("scripts/tools/square-tool",function(t,e,i){function s(t,e,i){r.call(this,t,e,i);var s=this;this.addEventListener("mouse:down",function(t){s.mouseDown(t)}),this.addEventListener("mouse:move",function(t){s.mouseMove(t)}),this.addEventListener("mouse:up",function(t){s.mouseUp(t)}),this.setLabel("Sq")}var o=e("scripts/inherit"),r=e("scripts/tools/shape-tool"),n=e("scripts/util");o(s,r),s.prototype.mouseDown=function(t){if(console.log("square down"),s.super.mouseDown.call(this,t),this.active){var e=n.getLoc(t.e),i=e.x,o=e.y;this.curr=new fabric.Rect({top:o,left:i,width:0,height:0,selectable:!1,lockUniScaling:!0}),this.canvas.add(this.curr)}},s.prototype.mouseMove=function(t){if(s.super.mouseMove.call(this,t),this.down!==!1){var e=n.getLoc(t.e),i=e.x-this.curr.left,o=e.y-this.curr.top,r=Math.abs(Math.abs(i)>Math.abs(o)?i:o);this.curr.width=r,0>i&&(this.curr.width*=-1),this.curr.height=r,0>o&&(this.curr.height*=-1),this.canvas.renderAll(!1)}},s.prototype.mouseUp=function(t){console.log("square up"),s.super.mouseUp.call(this,t),this.active&&(this.curr.width<0&&(this.curr.left=this.curr.left+this.curr.width,this.curr.width=-this.curr.width),this.curr.height<0&&(this.curr.top=this.curr.top+this.curr.height,this.curr.height=-this.curr.height),this.curr.setCoords(),this.canvas.renderAll(!1),this.actionComplete(this.curr),this.curr=void 0)},i.exports=s}),require.register("scripts/util",function(t,e,i){i.exports={dist:function(t,e){var i=Math.pow(t,2),s=Math.pow(e,2);return Math.sqrt(i+s)},getLoc:function(t){return t instanceof MouseEvent?{x:t.layerX,y:t.layerY}:t instanceof TouchEvent?{x:t.touches[0].clientX-$("canvas").offset().left,y:t.touches[0].clientY-$("canvas").offset().top}:void 0}}}),window.DrawingTool=require("scripts/drawing-tool");