export default [
  {
    ignores: ["node_modules/**"],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module", //  Use ECMAScript modules
      globals: {
        require: "readonly", // Fix 'require' is not defined
        module: "readonly",
        exports: "readonly",
        process: "readonly",
        __dirname: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn", // Show warnings for unused vars
      "no-undef": "off", // Fix 'require' and 'exports' errors
    },
  },
];
