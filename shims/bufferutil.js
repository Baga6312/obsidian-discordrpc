// Shim: pure-JS version of bufferutil's WebSocket frame (un)masking, used by ws.
function mask(source, m, output, offset, length) {
  for (let i = 0; i < length; i++) output[offset + i] = source[i] ^ m[i & 3];
}
function unmask(buffer, m) {
  for (let i = 0; i < buffer.length; i++) buffer[i] ^= m[i & 3];
}
module.exports = { mask, unmask };
