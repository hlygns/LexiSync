const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle the .sql migration files produced by drizzle-kit.
config.resolver.sourceExts.push('sql');

module.exports = config;
