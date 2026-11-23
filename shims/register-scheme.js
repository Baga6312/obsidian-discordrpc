// Shim: only used by discord-rpc to register a discord-<id>:// URL protocol.
// Not needed for the IPC connection; the native module can't load in Obsidian.
module.exports = function register() {};
