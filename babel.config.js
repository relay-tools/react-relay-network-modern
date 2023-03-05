module.exports = {
  plugins: [
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-transform-flow-strip-types',
  ],
  env: {
    lib: {
      plugins: ['@babel/plugin-proposal-class-properties'],
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              browsers: ['last 5 versions', 'ie 11', 'defaults'],
            },
          },
        ],
      ],
    },
    es: {
      plugins: ['@babel/plugin-proposal-class-properties'],
    },
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
          },
        ],
      ],
    },
  },
};
