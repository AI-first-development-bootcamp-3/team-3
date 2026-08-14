## 1. Remove oxlint

- [x] 1.1 Uninstall `oxlint`, delete `.oxlintrc.json`

## 2. Install ESLint

- [x] 2.1 Install `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`
- [x] 2.2 Create `eslint.config.js` (flat config) covering React + TypeScript + hooks rules
- [x] 2.3 Update `package.json` `lint` script to run ESLint

## 3. Install Prettier

- [x] 3.1 Install `prettier`, `eslint-config-prettier`
- [x] 3.2 Add `eslint-config-prettier` to the ESLint config so formatting rules don't conflict
- [x] 3.3 Add `format` script to `package.json`

## 4. Verify

- [x] 4.1 `npm run lint` runs clean against current source
- [x] 4.2 `npm run format` runs without errors
- [x] 4.3 `npm run build` still passes
