const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Use port 8080 for Metro bundler (Replit compatible)
config.server = {
  ...config.server,
  port: 8080,
};

// SVG transformer
config.transformer.babelTransformerPath = require.resolve(
  "react-native-svg-transformer",
);

// ❗ ОБЯЗАТЕЛЬНО для Expo Router
config.transformer.unstable_allowRequireContext = true;

// SVG extensions
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== "svg",
);
config.resolver.sourceExts.push("svg");

module.exports = config;
