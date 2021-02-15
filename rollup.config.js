import json from '@rollup/plugin-json';
import commonjs from "@rollup/plugin-commonjs";
import typescript from 'rollup-plugin-typescript';
import resolve from '@rollup/plugin-node-resolve'
import {
    terser
} from 'rollup-plugin-terser';

import pkg from './package.json';

function toMinPath(path) {
    return path.replace(/\.js$/, '.min.js');
}

export default [
    {
        input: './src/index.ts',
        plugins: [
            json(),
            resolve(),
            typescript(),
            commonjs()
        ],
        context: 'window',
        output: [{
            name: 'ArkadRecorder',
            format: 'es',
            file: pkg.main,
        }, ],
    },
    {
        input: './src/index.ts',
        plugins: [
            json(),
            resolve(),
            typescript(),
            terser({output: {comments: false}}),
            commonjs()
        ],
        context: 'window',
        output: [{
            name: 'ArkadRecorder',
            format: 'es',
            file: toMinPath(pkg.main),
            sourcemap: true,
        }, ],
    },
];