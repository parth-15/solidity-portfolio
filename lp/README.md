# LP Project

## Project Setup

Install all needed dependencies:

```bash
npm install --save-dev hardhat @ethersproject/abi @ethersproject/bytes @ethersproject/providers @nomicfoundation/hardhat-chai-matchers @nomicfoundation/hardhat-network-helpers @nomiclabs/hardhat-ethers @nomiclabs/hardhat-etherscan @typechain/ethers-v5 @typechain/hardhat @typescript-eslint/eslint-plugin @typescript-eslint/parser @types/chai @types/mocha @types/node chai dotenv eslint eslint-config-prettier eslint-config-standard eslint-plugin-import eslint-plugin-node eslint-plugin-prettier eslint-plugin-promise ethers hardhat-gas-reporter nodemon prettier prettier-plugin-solidity solidity-coverage ts-node typechain typescript
```

For the next command to execute correctly, we can't have an existing README.md file:

```bash
mv README.md README.md.bak
```

In the following command, select the "Create a TypeScript project" option and hit "Enter" until it installs:

```bash
npx hardhat
```

Copy over all the useful files that the Hardhat boilerplate doesn't give us. This gives us better linting and code formatting, as well as a better default Hardhat config file

```bash
cp ../crowdfund/.env.example ../crowdfund/.eslintignore ../crowdfund/.eslintrc.js ../crowdfund/.prettierignore ../crowdfund/.gitignore ../crowdfund/.solhint.json ../crowdfund/.solhintignore ../crowdfund/hardhat.config.ts ../crowdfund/tsconfig.json ./
```

Restore the README.md to its rightful place:

```bash
mv README.md.bak README.md
```

Ensure your project is setup correctly by running:

```bash
npx hardhat compile
```

Now you're all setup to begin writing tests and smart contracts! Check out the `crowdfund/` directory's `package.json`'s scripts section for useful commands

## Technical Spec
<!-- Here you should list the technical requirements of the project. These should include the points given in the project spec, but will go beyond what is given in the spec because that was written by a non-technical client who leaves it up to you to fill in the spec's details -->

-
-
-

## Code Coverage Report
<!-- Copy + paste your coverage report here before submitting your project -->
<!-- You can see how to generate a coverage report in the "Solidity Code Coverage" section located here: -->
<!-- https://learn.0xmacro.com/training/project-crowdfund/p/4 -->
File              |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
------------------|----------|----------|----------|----------|----------------|
 contracts/       |    99.35 |    85.42 |      100 |    99.49 |                |
  Ico.sol         |      100 |    92.42 |      100 |      100 |                |
  SpaceCoin.sol   |      100 |      100 |      100 |      100 |                |
  SpaceLP.sol     |    98.73 |       75 |      100 |    98.96 |            214 |
  SpaceRouter.sol |      100 |    91.67 |      100 |      100 |                |
 contracts/test/  |      100 |      100 |      100 |      100 |                |
  ForceFeeder.sol |      100 |      100 |      100 |      100 |                |
All files         |    99.35 |    85.42 |      100 |    99.49 |                |



## Design Exercise Answer
<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->

> How would you extend your LP contract to award additional rewards – say, a separate ERC-20 token – to further incentivize liquidity providers to deposit into your pool?

## Testnet Deploy Information

| Contract | Address Etherscan Link |
| -------- | ------- |
| SpaceCoin | `https://goerli.etherscan.io/address/0x5E78CE071B6a199C6253EA7FB6Eb90A308c5483c` |
| ICO | `https://goerli.etherscan.io/address/0x08654c2630482ba778d19416664D2273191CA7E2` |
| Router | `https://goerli.etherscan.io/address/0x27BDaBa8fb7DFf3d9051643Dfe468a9F7c95eE281` |
| Pool | `https://goerli.etherscan.io/address/0xF526dE308F75Fe633Aa1be67E691a73DEb98460d` |

## Useful Commands

Try running some of the following commands:

```shell
npx hardhat help
npx hardhat compile              # compile your contracts
npx hardhat test                 # run your tests
npm run test                     # watch for test file changes and automatically run tests
npx hardhat coverage             # generate a test coverage report at coverage/index.html
REPORT_GAS=true npx hardhat test # run your tests and output gas usage metrics
npx hardhat node                 # spin up a fresh in-memory instance of the Ethereum blockchain
npx prettier '**/*.{json,sol,md}' --write # format your Solidity and TS files
```