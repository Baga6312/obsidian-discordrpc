import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
const TEST_VAULT = 'test-vault/.obsidian/plugins/obsidian-discordrpc';
const optionalNativeModules = {
  name: 'optional-native-modules',
  resolveId(source) {
    if (
      source === 'bufferutil' ||
      source === 'utf-8-validate' ||
      source === 'node-gyp-build' ||
      source === 'bindings'
    ) {
      return `\0${source}`;
    }
    return null;
  },
  load(id) {
    if (id === '\0node-gyp-build' || id === '\0bindings') {
      return 'export default function optionalNativeModule() { throw new Error("Optional native module is unavailable"); };';
    }
    if (id === '\0bufferutil' || id === '\0utf-8-validate') {
      return 'export default {};';
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