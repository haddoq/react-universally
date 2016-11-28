module.exports = {
  client: {
    target: 'web',
    priority: 1,
    configFactory: './tools/webpack/configFactory',
    logColors: ['cyan', 'bold', 'inverse'],
    logPrefix: 'CLIENT',
    analyzer: {
      analyzerMode: 'server',
      analyzerPort: 8888
    },
    entryIndex: 'index.js',
    outputPath: './build/client',
    srcPath: './src/client',
    publicPath: '/client/',
    staticPath: './public',
    devServer: {
      host: "localhost",
      port: 7331
    },
    dll: {
      enabled: true,
      sharedPath: "./src/shared/universal",
      excludes: ['**/*.css']
    },
  },
  server: {
    target: 'server',
    priority: 3,
    configFactory: './tools/webpack/configFactory',
    envFiles: ['./.env'],
    envVars: {
      SERVER_PORT: 1337,
      SERVER_HOST: 'localhost',
      CLIENT_BUNDLE_CACHE_MAXAGE: '365d'
    },
    logColors: ['magenta', 'bold', 'inverse'],
    logPrefix: 'SERVER',
    entryIndex: 'index.js',
    outputPath: './build/server',
    srcPath: './src/server',
    nodeExternals: {
      whitelist: [
        /\.(eot|woff|woff2|ttf|otf)$/,
        /\.(svg|png|jpg|jpeg|gif|ico)$/,
        /\.(mp4|mp3|ogg|swf|webp)$/,
        /\.(css|scss|sass|sss|less)$/
      ]
    }
  },
  universalMw: {
    target: 'node',
    priority: 2,
    configFactory: './tools/webpack/configFactory',
    envFiles: ['./.env'],
    envVars: {
      DISABLE_SSR: false
    },
    logPrefix: 'UNI_MW',
    logColors: ['blue', 'bold', 'inverse'],
    outputPath: './build/universalMiddleware',
    srcPath: './src/universalMiddleware',
    entryIndex: 'index.js',
    nodeExternals: {
      whitelist: [
        /\.(eot|woff|woff2|ttf|otf)$/,
        /\.(svg|png|jpg|jpeg|gif|ico)$/,
        /\.(mp4|mp3|ogg|swf|webp)$/,
        /\.(css|scss|sass|sss|less)$/
      ]
    }
  }
}