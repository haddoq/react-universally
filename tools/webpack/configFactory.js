const f = require('wcf')()
// f.resolve.modules(`${__dirname}/../node_modules`)
// path: `${__dirname}/../node_modules/babel-loader`,
// f.resolve.modules(`${__dirname}/../node_modules`)

// Anything listed in externals will not be included in our bundle.
//
// Don't allow the server to bundle the universal middleware bundle. We
// want the server to natively require it from the build dir.
f.server.externals(/\.\.[/\\]universalMiddleware/)
f.server.dev.externals(/development[/\\]universalDevMiddleware/)

// Define our entry chunks for our bundle.
f.web.dev.entry.index('react-hot-loader/patch')

// We are using polyfill.io instead of the very heavy babel-polyfill.
// Therefore we need to add the regenerator-runtime as the babel-polyfill
// included this, which polyfill.io doesn't include.
f.web.entry.index('regenerator-runtime/runtime')

// These extensions are tried when resolving a file.
f.resolve.extensions([
  '.jsx'
])

f.pluginsWith((context, meta) => {
  const CodeSplitPlugin = require('code-split-component/webpack')
  return new CodeSplitPlugin({
    // The code-split-component doesn't work nicely with hot module reloading,
    // which we use in our development builds, so we will disable it (which
    // ensures synchronously behaviour on the CodeSplit instances).
    disabled: !f.prod.$hasSomeMeta(meta)
  })
})

// Adds options to all of our loaders.
f.web.prod.pluginsWith(() => {
  const {LoaderOptionsPlugin} = require('webpack')
  return new LoaderOptionsPlugin({
    // Indicates to our loaders that they should minify their output
    // if they have the capability to do so.
    minimize: true,
    // Indicates to our loaders that they should enter into debug mode
    // should they support it.
    debug: false,
  })
})

// JS Minification.
f.web.prod.pluginsWith(() => {
  const {UglifyJsPlugin} = require('webpack').optimize
  return new UglifyJsPlugin({
    // sourceMap: true,
    compress: {
      screw_ie8: true,
      warnings: false,
    },
    mangle: {
      screw_ie8: true,
    },
    output: {
      comments: false,
      screw_ie8: true,
    },
  })
})

// This is actually only useful when our deps are installed via npm2.
// In npm2 its possible to get duplicates of dependencies bundled
// given the nested module structure. npm3 is flat, so this doesn't
// occur.
f.web.prod.pluginsWith(() => {
  const {DedupePlugin} = require('webpack').optimize
  return new DedupePlugin
})

// This is a production client so we will extract our CSS into
// CSS files.
f.web.prod.pluginsWith(() => {
  const ExtractTextPlugin = require('extract-text-webpack-plugin')
  return new ExtractTextPlugin({
    filename: '[name]-[chunkhash].css',
    allChunks: true
  })
})

// Service Worker.
// @see https://github.com/goldhand/sw-precache-webpack-plugin
// This plugin generates a service worker script which as configured below
// will precache all our generated client bundle assets as well as the
// index page for our application.
// This gives us aggressive caching as well as offline support.
// Don't worry about cache invalidation. As we are using the Md5HashPlugin
// for our assets, any time their contents change they will be given
// unique file names, which will cause the service worker to fetch them.
// f.web.prod.pluginsWith((config, {buildPath, publicPath, appName, json, log}) => {
//   var {basename, resolve} = require('path')
//   appName = appName || 'tension-app'
//   const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin')
//   const clientBundleAssets = globSync(resolve(buildPath, '*.js'))
//   const dynamicUrlToDependencies = globSync(resolve(publicPath, '*'))
//     .reduce((acc, cur) => {
//       // We will precache our public asset, with it being invalidated
//       // any time our client bundle assets change.
//       acc[`/${basename(cur)}`] = clientBundleAssets // eslint-disable-line no-param-reassign,max-len
//       return acc;
//     },
//     {
//       // Our index.html page will be precatched and it will be
//       // invalidated and refetched any time our client bundle
//       // assets change.
//       '/': clientBundleAssets,
//       // Lets cache the call to the polyfill.io service too.
//       'https://cdn.polyfill.io/v2/polyfill.min.js': clientBundleAssets,
//     })
  
//   // Note: The default cache size is 2mb. This can be reconfigured:
//   // maximumFileSizeToCacheInBytes: 2097152,
//   const swPluginOpts = {
//     cacheId: `${appName}-sw`,
//     filepath: resolve(buildPath, 'serviceWorker', 'sw.js'),
//     dynamicUrlToDependencies,
//     logger: log.info
//   }

//   // When outputing a json stat file we want to silence the output.
//   // TODO XXX
//   // if (!!json) {
//     // swPluginOpts.verbose = false
//     // swPluginOpts.logger = () => {}
//   // }

//   return new SWPrecacheWebpackPlugin(swPluginOpts)
// })


// HappyPack plugins
// @see https://github.com/amireh/happypack/
//
// HappyPack allows us to use threads to execute our loaders. This means
// that we can get parallel execution of our loaders, significantly
// improving build and recompile times.
//
// This may not be an issue for you whilst your project is small, but
// the compile times can be signficant when the project scales. A lengthy
// compile time can significantly impare your development experience.
// Therefore we employ HappyPack to do threaded execution of our
// "heavy-weight" loaders.

// HappyPack 'javascript' instance.
f.pluginsWith((context, meta) => {
  const HappyPack = require('happypack');
  
  // We will use babel to do all our JS processing.
  const babelLoader = {
    path: 'babel-loader',
    query: {
      presets: [
        // JSX
        'react',
        // All the latest JS goodies, except for ES6 modules which
        // webpack has native support for and uses in the tree shaking
        // process.
        // TODO: When babel-preset-latest-minimal has stabilised use it
        // for our node targets so that only the missing features for
        // our respective node version will be transpiled.
        ['latest', { es2015: { modules: false } }],
      ],
      plugins: [
        // We are adding the experimental "object rest spread" syntax as
        // it is super useful.  There is a caviat with the plugin that
        // requires us to include the destructuring plugin too.
        'transform-object-rest-spread',
        'transform-es2015-destructuring',
        // The class properties plugin is really useful for react components.
        'transform-class-properties',
        // This plugin transpiles the code-split-component component
        // instances, taking care of all the heavy boilerplate that we
        // would have had to do ourselves to get code splitting w/SSR
        // support working.
        // @see https://github.com/ctrlplusb/code-split-component
        [
          'code-split-component/babel',
          {
            // The code-split-component doesn't work nicely with hot
            // module reloading, which we use in our development builds,
            // so we will disable it (which ensures synchronously
            // behaviour on the CodeSplit instances).
            disabled: !f.prod.$hasSomeMeta(meta),
            // When a node target (i.e. a server rendering bundle) then
            // we will set the role as being server which will ensure that
            // our code split components are resolved synchronously.
            role: f.web.$hasSomeMeta(meta) ? 'client' : 'server',
          },
        ]
      ]
    }
  }

  if (f.web.dev.$hasSomeMeta(meta)) {
    babelLoader.query.plugins.unshift('react-hot-loader/babel')
  }

  return new HappyPack({
    id: 'happypack-javascript',
    // thread: 4,
    verbose: false,
    debug: false,
    loaders: [
      babelLoader
    ]
  })
})

// HappyPack 'css' instance for development client.
f.web.dev.pluginsWith(() => {
  const HappyPack = require('happypack');
  return new HappyPack({
    id: 'happypack-devclient-css',
    // We will use a straight style & css loader along with source maps.
    // This combo gives us a better development experience.
    loaders: [
      'style-loader',
      { path: 'css-loader', query: { sourceMap: true } },
    ]
  })
})

// Javascript
f.module.rulesWith(({srcPath}) => ({
  test: /\.jsx?$/,
  // We will defer all our js processing to the happypack plugin
  // named "happypack-javascript".
  // See the respective plugin within the plugins section for full
  // details on what loader is being implemented.
  loader: 'happypack/loader?id=happypack-javascript',
  exclude: /node_modules/,
}))

// CSS
//
// For development clients we will defer all our css processing to the
// happypack plugin named "happypack-devclient-css".
// See the respective plugin within the plugins section for full
// details on what loader is being implemented.
f.web.dev.module.rules({
  test: /\.css$/,
  loaders: ['happypack/loader?id=happypack-devclient-css'],
})
// For a production client build we use the ExtractTextPlugin which
// will extract our CSS into CSS files.
// The plugin needs to be registered within the plugins section too.
// Also, as we are using the ExtractTextPlugin we can't use happypack
// for this case.
f.web.prod.module.rulesWith(() => {
  const ExtractTextPlugin = require('extract-text-webpack-plugin')
  return {
    test: /\.css$/,
    loader: ExtractTextPlugin.extract({
      fallbackLoader: 'style-loader',
      loader: 'css-loader',
    })
  }
})
// When targetting the server we use the "/locals" version of the
// css loader, as we don't need any css files for the server.
f.node.module.rules({
  test: /\.css$/,
  loaders: ['css-loader/locals'],
})

// Images and Fonts
f.module.rulesWith((context, meta) => ({
  test: /\.(jpg|jpeg|png|gif|ico|eot|svg|ttf|woff|woff2|otf)$/,
  loader: 'url-loader',
  query: {
    // Any file with a byte smaller than this will be "inlined" via
    // a base64 representation.
    limit: 10000,
    // We only emit files when building a client bundle, for the server
    // bundles this will just make sure any file imports will not fall
    // over.
    emitFile: f.web.$hasSomeMeta(meta)
  }
}))

module.exports = f