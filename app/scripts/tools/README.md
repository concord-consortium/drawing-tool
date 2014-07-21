# To create a new tool...

1. Import the needed files. This example will run through making an ArrowTool.
It inherits from the LineTool and might utilize the Utility class's functions.

        var inherit    = require('scripts/inherit');
        var LineTool   = require('scripts/tools/line-tool');
        var Util       = require('scripts/util'); // optional

2. Write the constructor

        function ArrowTool(name, selector, drawTool) {
          LineTool.call(this, name, selector, drawTool);
        }

3. 'Inherit' from the parent class using the `inherit function`. `inherit()`
takes two parameters, the child class (ArrowTool) and the parent class (LineTool).

        inherit (ArrowTool, LineTool);

4. Export the module

        module.exports = ArrowTool;

5. Now we are done with the `ArrowTool` class itself and it looks like this:

        var inherit    = require('scripts/inherit');
        var LineTool   = require('scripts/tools/line-tool');
        var Util       = require('scripts/util');

        function ArrowTool(name, selector, drawTool) {
          LineTool.call(this, name, selector, drawTool);
        }

        inherit (ArrowTool, LineTool);

        module.exports = ArrowTool;

6. Now the UI needs to import the ArrowTool class. In `ui.js` add:

        var ArrowTool         = require('scripts/tools/arrow-tool');


7. Initialize the ArrowTool instance in `UI.prototype.initTools()`.
(Steps 7 - 9 all modify the `UI.initTools()` function).=

        var arrowTool = new ArrowTool("Arrow Tool", "arrow", this.master);


8. Add a button for the tool into one (or more) of the tool palettes.
*Note:* use the selector that was passed to the constructor as the name
for the tool when configuring the tool palettes.

        var palettes = p || {
          lines: ['-select', 'line', 'arrow'],
          shapes: ['-select', 'rect', 'ellipse', 'square', 'circle'],
          main: ['select', '-lines', '-shapes', 'free', 'trash']
        };

9. Set the button's label.

        this.setLabel(arrowTool.selector,      "A");
