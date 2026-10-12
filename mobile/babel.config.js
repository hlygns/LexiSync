module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Lets the app import the generated .sql migration files as plain strings.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
