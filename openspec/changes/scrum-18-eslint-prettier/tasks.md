## 1. Remove oxlint

- [ ] 1.1 Uninstall `oxlint`, delete `.oxlintrc.json`

## 2. Install ESLint

- [ ] 2.1 Install `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`
- [ ] 2.2 Create `eslint.config.js` (flat config) covering React + TypeScript + hooks rules
- [ ] 2.3 Update `package.json` `lint` script to run ESLint

## 3. Install Prettier

- [ ] 3.1 Install `prettier`, `eslint-config-prettier`
- [ ] 3.2 Add `eslint-config-prettier` to the ESLint config so formatting rules don't conflict
- [ ] 3.3 Add `format` script to `package.json`

## 4. Verify

- [ ] 4.1 `npm run lint` runs clean against current source
- [ ] 4.2 `npm run format` runs without errors
- [ ] 4.3 `npm run build` still passes
