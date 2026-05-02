import { defineConfig } from "oxlint";
import type { DummyRuleMap } from "oxlint";
import reactHooks from "eslint-plugin-react-hooks";

function remapReactHooksRules(rules: DummyRuleMap): DummyRuleMap {
  return Object.fromEntries(
    Object.entries(rules).map(([ruleName, value]) => [
      ruleName.replace(/^react-hooks\//, "react-hooks-js/"),
      value,
    ]),
  ) as DummyRuleMap;
}

export default defineConfig({
  options: {
    typeAware: true,
  },

  plugins: ["typescript", "unicorn", "oxc", "react"],

  jsPlugins: [
    {
      name: "react-hooks-js",
      specifier: "eslint-plugin-react-hooks",
    },
  ],

  categories: {
    correctness: "error",
  },

  rules: {
    ...remapReactHooksRules(reactHooks.configs.flat.recommended.rules),
  },

  env: {
    builtin: true,
  },
});
