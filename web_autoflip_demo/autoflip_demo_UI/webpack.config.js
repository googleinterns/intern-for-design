const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    index: './src/index.ts',
    autoflip_worker: './src/autoflip_worker.ts',
    ffmpeg_worker: './src/ffmpeg_worker.ts',
    ffmpeg_worker_audio: './src/ffmpeg_worker_audio.ts',
    ffmpeg_worker_combine: './src/ffmpeg_worker_combine.ts',
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    publicPath: '/dist/',
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: 'file-loader',
        options: { name: '[name].[ext]?[hash]' },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
  devServer: { historyApiFallback: true, noInfo: true },
  performance: { hints: false },
  devtool: '#eval-source-map',
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/autoflip_wasm', to: 'autoflip_wasm' },
        { from: 'src/ffmpeg_wasm', to: 'ffmpeg_wasm' },
      ],
    }),
  ],
};
