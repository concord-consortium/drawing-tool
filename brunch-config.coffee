exports.config =
  # See http://brunch.io/#documentation for docs.
  files:
    javascripts:
      joinTo:
        'drawing-tool.js': /^app/
        'vendor.js': /^(bower_components|vendor)/
      order:
        after: ['app/initialize.js']
    stylesheets:
      joinTo:
        'drawing-tool.css': /^app/
        'vendor.css': /^(bower_components|vendor)/
    #templates:
    #  joinTo: 'app.js'

   # This prevents Brunch from wrapping app/initialize.js in CommonJS module definition.
   # See: https://github.com/brunch/brunch/issues/712
  conventions:
    vendor: /^(bower_components|vendor|app\/initialize\.js)/

  sourceMaps: false

  modules:
    wrapper: (path, data, isVendor) ->
      if isVendor
        """
        #{data}
        """
      else
        path = path.replace(/^app\//, '').replace(/\.js$/, '')
        """
        require.register("#{path}", function(exports, require, module) {
        var $ = jQuery;
        #{data}});\n\n
        """

  overrides:
    dist:
      optimize: false
      sourceMaps: false
      plugins:
        autoReload:
          enabled: false
        afterBrunch: [
          'echo "- updating ./dist directory"'
          'rsync -av --delete public/ dist --include="*.js" --include="*.css" --include="fonts/" --include="fonts/*" --exclude="*"'
        ]
