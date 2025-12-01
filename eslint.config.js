// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: ['dist/**', 'node_modules/**', '*.js', '*.cjs', '*.mjs', 'n8n-mcp/**', 'n8n-workflow-validator/**', 'output/**', 'planning/**']
  },
  
  // Base JavaScript recommended
  js.configs.recommended,
  
  // TypeScript recommended
  ...tseslint.configs.recommended,
  
  // Project configuration
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ============================================================
      // POSSIBLE PROBLEMS - Error Prevention
      // ============================================================
      'array-callback-return': 'error',
      'constructor-super': 'error',
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'off', // Intentional sequential processing with progress feedback
      'no-class-assign': 'error',
      'no-compare-neg-zero': 'error',
      'no-cond-assign': 'error',
      'no-const-assign': 'error',
      'no-constant-binary-expression': 'error',
      'no-constant-condition': 'error',
      'no-constructor-return': 'error',
      'no-control-regex': 'error',
      'no-debugger': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-duplicate-imports': 'error',
      'no-empty-character-class': 'error',
      'no-empty-pattern': 'error',
      'no-ex-assign': 'error',
      'no-fallthrough': 'error',
      'no-func-assign': 'error',
      'no-import-assign': 'error',
      'no-inner-declarations': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-loss-of-precision': 'error',
      'no-misleading-character-class': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-obj-calls': 'error',
      'no-promise-executor-return': 'error',
      'no-prototype-builtins': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-setter-return': 'error',
      'no-sparse-arrays': 'error',
      'no-template-curly-in-string': 'error',
      'no-this-before-super': 'error',
      'no-undef': 'off', // TypeScript handles this
      'no-unexpected-multiline': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-private-class-members': 'error',
      'no-unused-vars': 'off', // Use @typescript-eslint version
      'no-use-before-define': 'off', // Use @typescript-eslint version
      'no-useless-assignment': 'error',
      'no-useless-backreference': 'error',
      'require-atomic-updates': 'off', // False positives in sequential code
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // ============================================================
      // SUGGESTIONS - Code Quality
      // ============================================================
      'curly': 'error',
      'default-case': 'error',
      'default-case-last': 'error',
      'default-param-last': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'new-cap': 'error',
      'no-alert': 'error',
      'no-array-constructor': 'error',
      'no-caller': 'error',
      'no-case-declarations': 'error',
      'no-console': 'off', // CLI tool - console is required
      'no-empty': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-extra-boolean-cast': 'error',
      'no-global-assign': 'error',
      'no-implied-eval': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-multi-assign': 'error',
      'no-multi-str': 'error',
      'no-new-func': 'error',
      'no-new-wrappers': 'error',
      'no-nonoctal-decimal-escape': 'error',
      'no-object-constructor': 'error',
      'no-octal': 'error',
      'no-octal-escape': 'error',
      'no-proto': 'error',
      'no-return-assign': 'error',
      'no-script-url': 'error',
      'no-sequences': 'error',
      'no-shadow-restricted-names': 'error',
      'no-throw-literal': 'error',
      'no-unneeded-ternary': 'error',
      'no-unused-expressions': 'error',
      'no-unused-labels': 'error',
      'no-useless-call': 'error',
      'no-useless-catch': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-escape': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-var': 'error',
      'no-with': 'error',
      'one-var': ['error', 'never'],
      'prefer-const': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-rest-params': 'error',
      'radix': 'error',
      'require-yield': 'error',
      'yoda': 'error',

      // ============================================================
      // DISABLED - CLI Patterns & Style Preferences
      // ============================================================
      'complexity': 'off', // Validators are inherently complex
      'dot-notation': 'off',
      'max-depth': 'off', // Validation logic needs nesting
      'max-nested-callbacks': 'off',
      'max-params': 'off',
      'no-bitwise': 'off', // Intentional for permissions
      'no-else-return': 'off',
      'no-empty-function': 'off', // Intentional no-ops
      'no-implicit-coercion': 'off',
      'no-lonely-if': 'off',
      'no-loop-func': 'off',
      'no-nested-ternary': 'off', // Used appropriately in formatters
      'no-new': 'off',
      'no-param-reassign': 'off', // Workflow mutation is intentional
      'no-undef-init': 'off',
      'no-useless-concat': 'off',
      'no-void': 'off',
      'object-shorthand': 'off',
      'operator-assignment': 'off',
      'prefer-arrow-callback': 'off',
      'prefer-destructuring': 'off', // Style preference
      'prefer-exponentiation-operator': 'off',
      'prefer-numeric-literals': 'off',
      'prefer-object-has-own': 'off',
      'prefer-object-spread': 'off',
      'prefer-regex-literals': 'off',
      'prefer-spread': 'off',
      'prefer-template': 'off',
      'require-await': 'off', // Async for interface consistency
      'symbol-description': 'off',

      // ============================================================
      // TYPESCRIPT-ESLINT RULES
      // ============================================================
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'off', // CLI handles dynamic n8n JSON structures
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  }
);
