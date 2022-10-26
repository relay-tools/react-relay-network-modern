module.exports = {
  plugins: ['@babel/plugin-transform-runtime'],
  presets: ['@babel/preset-flow'],
  env: {
    lib: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              browsers: ['last 5 versions and not dead', 'defaults'],
            },
          },
        ],
      ],
    },
    es: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              browsers: ['last 5 versions and not dead', 'defaults'],
            },
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
            modules: 'commonjs',
          },
        ],
      ],
    },
    ie11: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              browsers: ['ie 11'],
            },
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
