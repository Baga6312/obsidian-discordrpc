// Shim for node-gyp-build / bindings: native add-ons can't load in Obsidian.
module.exports = function optionalNativeModule() {
  throw new Error('Optional native module is unavailable');
};
