import typescript from 'rollup-plugin-typescript';
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
        plugins: [typescript()],
        output: [{
            name: 'ArkadRecorder',
            format: 'es',
            file: pkg.main,
        }, ],
    },
    {
        input: './src/index.ts',
        plugins: [typescript(), terser()],
        output: [{
            name: 'ArkadRecorder',
            format: 'es',
            file: toMinPath(pkg.main),
            sourcemap: true,
        }, ],
    },
];