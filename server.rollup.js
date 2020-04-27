import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import json from "rollup-plugin-json";
import { terser } from "rollup-plugin-terser";
import pkg from "./package.json";

export default {
  input: "./src/index.js",
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
  ],
  external: (pkg.dependencies ? Object.keys(pkg.dependencies) : []).concat([
    "fs",
    "child_process",
  ]),
  plugins: [
    json(),
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs({
      include: [/node_modules/],
    }),
    babel({
      exclude: [/node_modules/],
    }),
    terser(),
  ],
};
