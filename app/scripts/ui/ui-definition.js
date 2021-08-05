var StrokeButton    = require('./stroke-button');
var FillButton      = require('./fill-button');
var ColorButton     = require('./color-button');
var LineWidthButton = require('./line-width-button');
var SelectedLineWidthButton = require('./selected-line-width-button');

var COLORS = [
  {value: '',        icon: require('../../assets/color-none-icon.svg')},
  {value: '#3f3f3f', icon: require('../../assets/color-black-icon.svg')},
  {value: '#fff',    icon: require('../../assets/color-white-icon.svg')},
  {value: '#bfbfbf', icon: require('../../assets/color-gray-icon.svg')},
  {value: '#eb0000', icon: require('../../assets/color-red-icon.svg')},
  {value: '#008a00', icon: require('../../assets/color-green-icon.svg')},
  {value: '#00f',    icon: require('../../assets/color-blue-icon.svg')},
  {value: '#ff8415', icon: require('../../assets/color-orange-icon.svg')},
  {value: '#ff0',    icon: require('../../assets/color-yellow-icon.svg')},
  {value: '#d100d1', icon: require('../../assets/color-purple-icon.svg')},
 ];

var STROKE_WIDTHS = [
  {value: 1, icon:  require('../../assets/line-width-1-px-icon.svg')},
  {value: 2, icon:  require('../../assets/line-width-2-px-icon.svg')},
  {value: 4, icon:  require('../../assets/line-width-4-px-icon.svg')},
  {value: 8, icon:  require('../../assets/line-width-8-px-icon.svg')},
  {value: 12, icon: require('../../assets/line-width-12-px-icon.svg')},
  {value: 16, icon: require('../../assets/line-width-16-px-icon.svg')},
  {value: 20, icon: require('../../assets/line-width-20-px-icon.svg')},
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


var FONT_ICONS = {
  12: require('../../assets/text-12-pt-icon.svg'),
  17: require('../../assets/text-17-pt-icon.svg'),
  22: require('../../assets/text-22-pt-icon.svg'),
  27: require('../../assets/text-27-pt-icon.svg'),
  32: require('../../assets/text-32-pt-icon.svg'),
  37: require('../../assets/text-37-pt-icon.svg'),
  42: require('../../assets/text-42-pt-icon.svg')
};

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
      name: 'select',
      label: 's',
      tooltip: 'Select tool',
      activatesTool: 'select',
      palette: 'main',
      icon: require('../../assets/select-icon.svg')
    },
    {
      name: 'free',
      tooltip: 'Free hand drawing tool',
      label: 'F',
      activatesTool: 'free',
      palette: 'main',
      icon: require('../../assets/freehand-icon.svg')
    },
    {
      name: 'linesPalette',
      tooltip: 'Line tool (click and hold to show available line types)',
      classes: 'dt-expand',
      reflectsTools: ['line', 'arrow', 'doubleArrow'],
      palette: 'main',
      onInit: function () {
        this.setLabelOrIcon(this.ui.getPaletteActiveButton('lines'));
      },
      onClick: function () {
        this.ui.getPaletteActiveButton('lines').click();
      },
      onLongPress: function () {
        this.ui.togglePalette('lines');
      },
      icon: require('../../assets/line-icon.svg')
    },
    {
      name: 'shapesPalette',
      tooltip: 'Basic shape tool (click and hold to show available shapes)',
      classes: 'dt-expand',
      reflectsTools: ['rect', 'ellipse', 'square', 'circle'],
      palette: 'main',
      onInit: function () {
        this.setLabelOrIcon(this.ui.getPaletteActiveButton('shapes'));
      },
      onClick: function () {
        this.ui.getPaletteActiveButton('shapes').click();
      },
      onLongPress: function () {
        this.ui.togglePalette('shapes');
      },
      icon: require('../../assets/circle-icon.svg')
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
      },
      onStateChange: function (state) {
        if (state.fontSize && FONT_ICONS[state.fontSize]) {
          this.$icon.attr('src', FONT_ICONS[state.fontSize].default);
        }
      },
      icon: require('../../assets/text-27-pt-icon.svg')
    },
    {
      name: 'strokeColorPalette',
      tooltip: 'Stroke color (click and hold to show available colors)',
      buttonClass: StrokeButton,
      // Do not exit text edit mode on click. See text tool class.
      classes: 'dt-keep-text-edit-mode',
      palette: 'main',
      onInit: function () {
        this.setColor(this.dt.state.stroke);
      },
      onStateChange: function (state) {
        this.setColor(state.stroke);
      },
      onClick: function () {
        this.ui.togglePalette('strokeColors');
      },
      icon: require('../../assets/color-stroke-icon.svg')
    },
    {
      name: 'fillColorPalette',
      tooltip: 'Fill color (click and hold to show available colors)',
      buttonClass: FillButton,
      palette: 'main',
      onInit: function () {
        this.setColor(this.dt.state.fill);
      },
      onStateChange: function (state) {
        this.setColor(state.fill);
      },
      onClick: function () {
        this.ui.togglePalette('fillColors');
      },
      icon: require('../../assets/color-fill-icon.svg')
    },
    {
      name: 'strokeWidthPalette',
      tooltip: 'Stroke width (click and hold to show available options)',
      buttonClass: SelectedLineWidthButton,
      label: 'w',
      palette: 'main',
      onClick: function () {
        this.ui.togglePalette('strokeWidths');
      },
      onStateChange: function (state) {
        this.setLineWidth(state.strokeWidth);
      },
      icon: require('../../assets/line-width-icon.svg')
    },
    {
      name: 'clone',
      tooltip: 'Clone tool',
      label: 'c',
      activatesTool: 'clone',
      palette: 'main',
      onInit: lockWhenNothingIsSelected,
      icon: require('../../assets/clone-icon.svg')
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
      },
      icon: require('../../assets/send-to-back-icon.svg')
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
      },
      icon: require('../../assets/send-to-front-icon.svg')
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
      },
      icon: require('../../assets/undo-icon.svg')
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
      },
      icon: require('../../assets/redo-icon.svg')
    },
    {
      name: 'trash',
      tooltip: 'Delete selected objects',
      label: 'd',
      activatesTool: 'trash',
      palette: 'main',
      onInit: lockWhenNothingIsSelected,
      icon: require('../../assets/delete-selection-icon.svg')
    },
    /***
     * Line tools
     ***/
    {
      name: 'line',
      tooltip: 'Line',
      label: 'L',
      activatesTool: 'line',
      palette: 'lines',
      icon: require('../../assets/line-icon.svg')
    },
    {
      name: 'arrow',
      tooltip: 'Arrow',
      label: 'A',
      activatesTool: 'arrow',
      palette: 'lines',
      icon: require('../../assets/line-w-arrowhead-icon.svg')
    },
    {
      name: 'doubleArrow',
      tooltip: 'Double arrow',
      label: 'D',
      activatesTool: 'doubleArrow',
      palette: 'lines',
      icon: require('../../assets/line-w-double-arrowhead-icon.svg')
    },
    /***
     * Shape tools
     ***/
     {
      name: 'circle',
      tooltip: 'Circle',
      label: 'C',
      activatesTool: 'circle',
      palette: 'shapes',
      icon: require('../../assets/circle-icon.svg')
    },
    {
      name: 'square',
      tooltip: 'Square',
      label: 'S',
      activatesTool: 'square',
      palette: 'shapes',
      icon: require('../../assets/square-icon.svg')
    },
    {
      name: 'ellipse',
      tooltip: 'Ellipse',
      label: 'E',
      activatesTool: 'ellipse',
      palette: 'shapes',
      icon: require('../../assets/ellipse-icon.svg')
    },
    {
      name: 'rect',
      tooltip: 'Rectangle',
      label: 'R',
      activatesTool: 'rect',
      palette: 'shapes',
      icon: require('../../assets/rectangle-icon.svg')
    }
  ],
  optionalButtons: [
    {
      name: 'annotation',
      tooltip: 'Annotation tool',
      label: 'a',
      // Do not exit text edit mode on click. See text tool class.
      classes: 'dt-keep-text-edit-mode',
      activatesTool: 'annotation',
      palette: 'main',
      icon: require('../../assets/annotation-icon.svg')
    }
  ]
};

FONT_SIZES.forEach(function (fontSize) {
  ui.buttons.push({
    label: 'T',
    tooltip: fontSize + 'px',
    // Do not exit text edit mode on click. See text tool class.
    classes: 'dt-keep-text-edit-mode',
    onClick: function () {
      this.dt.setFontSize(fontSize);
      this.dt.setSelectionFontSize(fontSize);
    },
    onStateChange: function (state) {
      this.setActive(state.fontSize === fontSize);
    },
    palette: 'fontSizes',
    icon: FONT_ICONS[fontSize]
  });
});

COLORS.forEach(function (color) {
  ui.buttons.push({
    buttonClass: ColorButton,
    tooltip: color.value,
    // Do not exit text edit mode on click. See text tool class.
    classes: 'dt-keep-text-edit-mode',
    color: color.value,
    type: 'stroke',
    palette: 'strokeColors',
    icon: color.icon
  });
  ui.buttons.push({
    buttonClass: ColorButton,
    tooltip: color.value,
    color: color.value,
    type: 'fill',
    palette: 'fillColors',
    icon: color.icon
  });
});

STROKE_WIDTHS.forEach(function (width) {
  ui.buttons.push({
    buttonClass: LineWidthButton,
    tooltip: width.value + 'px',
    width: width.value,
    palette: 'strokeWidths',
    icon: width.icon
  });
});

// Helper functions that may be used by buttons.
// Note that all listeners are called in the context
// of the button isntance (`this` value).
function lockWhenNothingIsSelected() {
  this.setLocked(true);
  this.dt.canvas.on("selection:created", function () {
    this.setLocked(false);
  }.bind(this));
  this.dt.canvas.on("selection:cleared", function () {
    this.setLocked(true);
  }.bind(this));
}

module.exports = ui;
