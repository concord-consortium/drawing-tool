var StrokeButton    = require('scripts/ui/stroke-button');
var FillButton      = require('scripts/ui/fill-button');
var ColorButton     = require('scripts/ui/color-button');
var LineWidthButton = require('scripts/ui/line-width-button');

var COLORS = [
  '',
  '#efefef',
  '#e66665',
  '#75b792',
  '#076bb6',
  '#ffd605',
  '#f47d43',
  '#ae70af',
  '#a9b2b1',
  '#333333'
];

var STROKE_WIDTHS = [
  1,
  2,
  4,
  8,
  12,
  16,
  20
];

var FONT_SIZES = [
  12,
  17,
  22,
  27,
  32,
  37,
  42
];

var ui = {
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
    },
    {
      name: 'fontSizes',
      anchor: 'text'
    },
    {
      name: 'strokeColors',
      anchor: 'strokeColorPalette'
    },
    {
      name: 'fillColors',
      anchor: 'fillColorPalette'
    },
    {
      name: 'strokeWidths',
      anchor: 'strokeWidthPalette'
    }
  ],
  buttons: [
    /***
     * Main tools
     ***/
    {
      label: 's',
      tooltip: 'Select tool',
      activatesTool: 'select',
      palette: 'main'
    },
    {
      name: 'linesPalette',
      tooltip: 'Lines tool (click and hold to show available line types)',
      classes: 'dt-expand',
      reflectsTools: ['line', 'arrow', 'doubleArrow'],
      palette: 'main',
      onInit: function () {
        this.setLabel(this.ui.getPaletteActiveButton('lines').getLabel());
      },
      onClick: function () {
        this.ui.getPaletteActiveButton('lines').click();
      },
      onLongPress: function () {
        this.ui.togglePalette('lines');
      }
    },
    {
      name: 'shapesPalette',
      tooltip: 'Basic shapes tool (click and hold to show available shapes)',
      classes: 'dt-expand',
      reflectsTools: ['rect', 'ellipse', 'square', 'circle'],
      palette: 'main',
      onInit: function () {
        this.setLabel(this.ui.getPaletteActiveButton('shapes').getLabel());
      },
      onClick: function () {
        this.ui.getPaletteActiveButton('shapes').click();
      },
      onLongPress: function () {
        this.ui.togglePalette('shapes');
      }
    },
    {
      name: 'free',
      tooltip: 'Free hand drawing tool',
      label: 'F',
      activatesTool: 'free',
      palette: 'main'
    },
    {
      name: 'text',
      tooltip: 'Text tool (click and hold to show available font sizes)',
      label: 'T',
      // Do not exit text edit mode on click. See text tool class.
      classes: 'dt-expand dt-keep-text-edit-mode',
      activatesTool: 'text',
      palette: 'main',
      onLongPress: function () {
        this.ui.togglePalette('fontSizes');
      }
    },
    {
      name: 'clone',
      tooltip: 'Clone tool',
      label: 'c',
      activatesTool: 'clone',
      palette: 'main',
      onInit: lockWhenNothingIsSelected
    },
    {
      name: 'strokeColorPalette',
      tooltip: 'Stroke color (click and hold to show available colors)',
      buttonClass: StrokeButton,
      // Do not exit text edit mode on click. See text tool class.
      classes: 'dt-expand dt-keep-text-edit-mode',
      palette: 'main',
      onInit: function () {
        this.setColor(this.dt.state.stroke);
      },
      onStateChange: function (state) {
        this.setColor(state.stroke);
      },
      onClick: function () {
        this.ui.togglePalette('strokeColors');
      }
    },
    {
      name: 'fillColorPalette',
      tooltip: 'Fill color (click and hold to show available colors)',
      buttonClass: FillButton,
      classes: 'dt-expand',
      palette: 'main',
      onInit: function () {
        this.setColor(this.dt.state.fill);
      },
      onStateChange: function (state) {
        this.setColor(state.fill);
      },
      onClick: function () {
        this.ui.togglePalette('fillColors');
      }
    },
    {
      name: 'strokeWidthPalette',
      tooltip: 'Stroke width (click and hold to show available options)',
      label: 'w',
      classes: 'dt-expand',
      palette: 'main',
      onClick: function () {
        this.ui.togglePalette('strokeWidths');
      }
    },
    {
      name: 'sendToBack',
      tooltip: 'Send selected objects to back',
      label: 'm',
      classes: 'dt-send-to',
      palette: 'main',
      onInit: lockWhenNothingIsSelected,
      onClick: function () {
        this.dt.sendSelectionToBack();
      }
    },
    {
      name: 'sendToFront',
      tooltip: 'Send selected objects to front',
      label: 'l',
      classes: 'dt-send-to',
      palette: 'main',
      onInit: lockWhenNothingIsSelected,
      onClick: function () {
        this.dt.sendSelectionToFront();
      }
    },
    {
      name: 'undo',
      tooltip: 'Undo',
      label: 'u',
      classes: 'dt-undo-redo',
      palette: 'main',
      onClick: function () {
        this.dt.undo();
      },
      onInit: function () {
        this.setLocked(true);
        this.dt.on("undo:possible", function () {
          this.setLocked(false);
        }.bind(this));
        this.dt.on("undo:impossible", function () {
          this.setLocked(true);
        }.bind(this));
      }
    },
    {
      name: 'redo',
      tooltip: 'Redo',
      label: 'r',
      classes: 'dt-undo-redo',
      palette: 'main',
      onClick: function () {
        this.dt.redo();
      },
      onInit: function () {
        this.setLocked(true);
        this.dt.on("redo:possible", function () {
          this.setLocked(false);
        }.bind(this));
        this.dt.on("redo:impossible", function () {
          this.setLocked(true);
        }.bind(this));
      }
    },
    {
      name: 'trash',
      tooltip: 'Delete selected objects',
      label: 'd',
      activatesTool: 'trash',
      palette: 'main',
      onInit: lockWhenNothingIsSelected
    },
    /***
     * Line tools
     ***/
    {
      name: 'line',
      tooltip: 'Line',
      label: 'L',
      activatesTool: 'line',
      palette: 'lines'
    },
    {
      name: 'arrow',
      tooltip: 'Arrow',
      label: 'A',
      activatesTool: 'arrow',
      palette: 'lines'
    },
    {
      name: 'doubleArrow',
      tooltip: 'Double arrow',
      label: 'D',
      activatesTool: 'doubleArrow',
      palette: 'lines'
    },
    /***
     * Shape tools
     ***/
    {
      name: 'rect',
      tooltip: 'Rectangle',
      label: 'R',
      activatesTool: 'rect',
      palette: 'shapes'
    },
    {
      name: 'ellipse',
      tooltip: 'Ellipse',
      label: 'E',
      activatesTool: 'ellipse',
      palette: 'shapes'
    },
    {
      name: 'square',
      tooltip: 'Square',
      label: 'S',
      activatesTool: 'square',
      palette: 'shapes'
    },
    {
      name: 'circle',
      tooltip: 'Circle',
      label: 'C',
      activatesTool: 'circle',
      palette: 'shapes'
    }
  ]
};

FONT_SIZES.forEach(function (fontSize) {
  ui.buttons.push({
    label: 'T',
    tooltip: fontSize + 'px',
    // Do not exit text edit mode on click. See text tool class.
    classes: 'dt-keep-text-edit-mode',
    onInit: function () {
      this.$element.css('font-size', fontSize);
      // It just looks better for given set of font sizes.
      this.$element.css('line-height', '50px');
    },
    onClick: function () {
      this.dt.setFontSize(fontSize);
      this.dt.setSelectionFontSize(fontSize);
    },
    onStateChange: function (state) {
      this.setActive(state.fontSize === fontSize);
    },
    palette: 'fontSizes'
  });
});

COLORS.forEach(function (color) {
  ui.buttons.push({
    buttonClass: ColorButton,
    tooltip: color,
    // Do not exit text edit mode on click. See text tool class.
    classes: 'dt-keep-text-edit-mode',
    color: color,
    type: 'stroke',
    palette: 'strokeColors'
  });
  ui.buttons.push({
    buttonClass: ColorButton,
    tooltip: color,
    color: color,
    type: 'fill',
    palette: 'fillColors'
  });
});

STROKE_WIDTHS.forEach(function (width) {
  ui.buttons.push({
    buttonClass: LineWidthButton,
    tooltip: width + 'px',
    width: width,
    palette: 'strokeWidths'
  });
});

// Helper functions that may be used by buttons.
// Note that all listeners are called in the context
// of the button isntance (`this` value).
function lockWhenNothingIsSelected() {
  this.setLocked(true);
  this.dt.canvas.on("object:selected", function () {
    this.setLocked(false);
  }.bind(this));
  this.dt.canvas.on("selection:cleared", function () {
    this.setLocked(true);
  }.bind(this));
}

module.exports = ui;
