module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'airbnb-typescript/base',
        "plugin:@typescript-eslint/recommended",
    ],
    parserOptions: {
        project: './tsconfig.json',
    },
    rules: {
        "indent": ["error", 4],
        "@typescript-eslint/indent": ["error", 4],
        "@typescript-eslint/no-inferrable-types": "off",
        "import/prefer-default-export": "off",
    },
};
