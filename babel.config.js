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
              browsers: ['last 5 versions', 'ie 9', 'defaults'],
            },
            useBuiltIns: 'usage',
          },
        ],
      ],
    },
    es: {
      plugins: ['@babel/plugin-proposal-class-properties'],
    },
    mjs: {
      plugins: ['@babel/plugin-proposal-class-properties'],
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              browsers: ['last 5 versions', 'ie 9', 'defaults'],
            },
            loose: true,
            modules: false,
          },
        ],
      ],
    },
    node8: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: '8.0.0',
            },
            loose: true,
            modules: 'commonjs',
          },
        ],
      ],
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
