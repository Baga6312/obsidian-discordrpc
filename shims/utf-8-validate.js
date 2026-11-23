// Shim: pure-JS version of utf-8-validate, used by ws.
const decoder = new TextDecoder('utf-8', { fatal: true });
function isValidUTF8(buf) {
  try { decoder.decode(buf); return true; } catch (e) { return false; }
}
isValidUTF8.isValidUTF8 = isValidUTF8;
isValidUTF8.Validation = { isValidUTF8 };
module.exports = isValidUTF8;
