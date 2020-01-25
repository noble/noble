module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 2017
  },
  env: {
    browser: true,
    mocha: true,
    node: true
  },
  globals: {
    Promise: true
  },
  rules: {
    "no-unused-vars": 0,
    "no-undef": 0
  }
};
