module.exports = {
  /***
   * Palettes
   ***/
  palettes: [
    {
      name: 'main',
      permanent: true,
      vertical: true
    },
    {
      name: 'lines',
      anchor: 'linesPalette'
    },
    {
      name: 'shapes',
      anchor: 'shapesPalette'
    }
  ],
  buttons: [
    /***
     * Main tools
     ***/
    {
      label: 's',
      activatesTool: 'select',
      palette: 'main'
    },
    {
      name: 'linesPalette',
      class: 'dt-expand',
      reflectsTools: ['line', 'arrow', 'doubleArrow'],
      palette: 'main',
      onInit: function (ui) {
        this.setLabel(ui.getPaletteActiveButton('lines').getLabel());
      },
      onClick: function (e, ui) {
        ui.getPaletteActiveButton('lines').click();
      },
      onLongPress: function (e, ui) {
        ui.openPalette('lines');
      }
    },
    {
      name: 'shapesPalette',
      class: 'dt-expand',
      reflectsTools: ['rect', 'ellipse', 'square', 'circle'],
      palette: 'main',
      onInit: function (ui) {
        this.setLabel(ui.getPaletteActiveButton('shapes').getLabel());
      },
      onClick: function (e, ui) {
        ui.getPaletteActiveButton('shapes').click();
      },
      onLongPress: function (e, ui) {
        ui.openPalette('shapes');
      }
    },
    {
      name: 'free',
      label: 'F',
      activatesTool: 'free',
      palette: 'main'
    },
    {
      name: 'text',
      label: 'T',
      activatesTool: 'text',
      palette: 'main'
    },
    {
      name: 'trash',
      label: 'd',
      activatesTool: 'trash',
      palette: 'main',
      onInit: function (ui, drawingTool) {
        this.setLocked(true);
        drawingTool.canvas.on("object:selected", function () {
          this.setLocked(false);
        }.bind(this));
        drawingTool.canvas.on("selection:cleared", function () {
          this.setLocked(true);
        }.bind(this));
      }
    },
    /***
     * Line tools
     ***/
    {
      name: 'line',
      label: 'L',
      activatesTool: 'line',
      palette: 'lines'
    },
    {
      name: 'arrow',
      label: 'A',
      activatesTool: 'arrow',
      palette: 'lines'
    },
    {
      name: 'doubleArrow',
      label: 'D',
      activatesTool: 'doubleArrow',
      palette: 'lines'
    },
    /***
     * Shape tools
     ***/
    {
      name: 'rect',
      label: 'R',
      activatesTool: 'rect',
      palette: 'shapes'
    },
    {
      name: 'ellipse',
      label: 'E',
      activatesTool: 'ellipse',
      palette: 'shapes'
    },
    {
      name: 'square',
      label: 'S',
      activatesTool: 'square',
      palette: 'shapes'
    },
    {
      name: 'circle',
      label: 'C',
      activatesTool: 'circle',
      palette: 'shapes'
    }
  ]
};
