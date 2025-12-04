/**
 * @type {import("prettier").Config}
 */
const config = {
  trailingComma: "all",
  useTabs: false,
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  plugins: ["prettier-plugin-tailwindcss"],
};

export default config;
