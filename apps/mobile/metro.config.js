const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so workspace packages resolve correctly
config.watchFolders = [workspaceRoot];

// Let Metro find modules in both the app's own node_modules and the root's
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Follow pnpm symlinks
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
