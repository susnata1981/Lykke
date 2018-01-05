var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: ['../public/js/app.js', '../public/js/business.js'],
  output: {
    path: path.resolve(__dirname, '../public/js'),
    filename: 'bundle.js'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      query: {
        presets: ['../../functions/node_modules/babel-preset-es2015']
      }
    }
    ]
  },
  stats: {
    colors: true
  },
  devtool: 'source-map'
};