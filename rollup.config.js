import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
import path from 'path';
const TEST_VAULT = 'test-vault/.obsidian/plugins/obsidian-discordrpc';
// Native add-ons pulled in by discord-rpc (register-scheme) and ws (bufferutil,
// utf-8-validate) cannot be loaded inside Obsidian, and building them needs
// node-gyp + Python + MSVC. @rollup/plugin-commonjs hoists their guarded
// `try { require(...) }` calls to top-level imports, so a missing module or a
// stub that throws breaks the plugin at load time. Resolve them to pure-JS
// shims in ./shims instead. (Real files rather than \0 virtual ids: commonjs
// v15 strips the \0 prefix from its proxies and treats them as externals.)
const NATIVE_SHIMS = {
  'register-scheme': 'shims/register-scheme.js',
  'bufferutil': 'shims/bufferutil.js',
  'utf-8-validate': 'shims/utf-8-validate.js',
  'node-gyp-build': 'shims/native-unavailable.js',
  'bindings': 'shims/native-unavailable.js'
};
const optionalNativeModules = {
  name: 'optional-native-modules',
  resolveId(source) {
    if (Object.prototype.hasOwnProperty.call(NATIVE_SHIMS, source)) {
      return path.resolve(NATIVE_SHIMS[source]);
    }
    return null;
  },
  transform(code, id) {
    if (id.endsWith('bindings/bindings.js')) {
      return {
        code: 'module.exports = function optionalBindings() { return { registerProtocolHandler: function() { return false; } }; };',
        map: null
      };
    }
    return null;
  }
};

export default {
  input: {
    main: 'src/main.ts',
    'discord-rpc': 'src/discord-rpc.ts'
  },
  output: {
    dir: 'dist/',
    sourcemap: 'inline',
    format: 'cjs',
    exports: 'auto',
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js'
  },
  external: ['obsidian', 'electron', 'net', 'events', 'timers'],
  plugins: [
    json(), 
    typescript({
      tsconfig: './tsconfig.json',
      include: ['src/**/*.ts']
    }),
    optionalNativeModules,
    nodeResolve({browser: true,preferBuiltins: false}),
    commonjs(),
    copy({
      hook: 'writeBundle',
      targets: [
        { src: 'dist/*.js', dest: TEST_VAULT, flatten: true },
        { src: ['manifest.json', 'styles.css'], dest: TEST_VAULT }
      ], flatten: true
    })
  ]
};