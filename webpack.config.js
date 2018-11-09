'use strict';

const webpack = require('webpack');
const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const str = JSON.stringify;
const env = process.env;

module.exports = {
  devtool: 'source-map',
  mode: 'production',
  target: 'node',
  /**
   * 入口起点(entry point)指示 webpack 应该使用哪个模块，来作为构建其内部依赖图的开始
   * 每个依赖项随即被处理，最后输出到称之为 bundles 的文件中
   */
  entry: {
    'gamecloud': './facade/gamecloud'
  },
  /**
   * 输出
   */
  output: {
    path: path.join(__dirname, 'lib'),
    filename: '[name].js',
    libraryTarget: 'commonjs2'
  },
  resolve: {
    modules: [path.resolve(__dirname, 'node_modules')], //据说比 'node_modules' 有更快的解析速度
    /**
     * 自动解析确定的扩展。默认值为：extensions: [".node", ".js", ".json"]
     * 能够使用户在引入模块时不带扩展：import File from '../path/to/file'
     * 遵循前置扩展优先的原则，即 node 优先于 js，而 js 优先于 json
     * 举例说明，用户引入模块时使用了'/lib/net/tcp', 则当前 extensions 设置下，会优先匹配 '/lib/net/tcp.node'，如果未发现则继续匹配'/lib/net/tcp.js'
     */
    extensions: ['.node', '.js', '.json'],
    alias: {
      'bindings': path.resolve(__dirname, 'webpack', 'bindings.js')
    }
  },
  node: {
    __dirname: false,
    __filename: false
  },
  module: {
    rules: [{
      test: /\.node$/,
      loader: 'node-loader'
    }]
  },
  /**
   * 插件
   */
  plugins: [
    new webpack.IgnorePlugin(/^utf-8-validate|bufferutil$/),
    new UglifyJsPlugin({
      sourceMap: true
    }),
  ]
};
