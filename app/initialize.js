// See: https://github.com/brunch/brunch/issues/712

// Export DrawingTool constructor to 'window' object. There is an assumption
// that DrawingTool is always included using a script tag on a regular web page.
// However we can implement CommonJS and AMD support here too (e.g. using similar
// code snippet that is used by Browserify when 'standalone' option is enabled).
window.DrawingTool = require('js/drawing-tool');
