exports.config =
  # See http://brunch.io/#documentation for docs.
  files:
    javascripts:
      joinTo: 'drawing-tool.js'
      order:
      	after: ['app/initialize.js']
    stylesheets:
      joinTo: 'drawing-tool.css'
    templates:
      joinTo: 'app.js'

   # This prevents Brunch from wrapping app/initialize.js in CommonJS module definition.
   # See: https://github.com/brunch/brunch/issues/712
   conventions:
    vendor: /vendor[\\/]|app\/initialize\.js/
