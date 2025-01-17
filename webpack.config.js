const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // 入口文件
  entry: './src/index.js',
  // 输出配置
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'bundle.js',
    publicPath: '/' // 确保路由正常工作
  },
  module: {
    rules: [
      // 处理 JavaScript/React 文件
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      // 处理 CSS 文件
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    // 自动生成 HTML 文件并注入打包后的资源
    new HtmlWebpackPlugin({
      template: './src/index.html'
    })
  ],
  mode: "development",
  // 支持 React Router 的历史记录模式
  devServer: {
    historyApiFallback: true,
    proxy: [{
      context: ['/api', '/docs'],
      target: 'http://localhost:3000'
    }]
  }
}; 