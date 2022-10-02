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
### SpaceLP 
#### Deposit
- Anyone can deposit SPC tokens and ETH to the LP contract to earn some LP tokens.
- If only one of the assets is considered as transferred by the pool, it reverts.
- If no assets is transferred, it reverts.
- The pool mints different LP tokens based on whether it is first liquidity or not.
- The user is penalized by the pool for depositing inconsistent liquidity.
- There is no fee for deposit.

#### Withdraw
- For withdrawal of liquidity, the LP provider should first transfer the LP tokens to the pool.
- The pool then sends the SPC token and ETH according to deposited LP tokens.
- LP tokens are burned.
- Total supply of LP tokens should be more than `0` for withdraw to be called.
- There is no fee for withdrawal.

#### Swap
- Traders can trade SPC for ETH and ETH for SPC.
- The fee taken for trade is `1%` and is taken on input amount made.
- If both the assets are considered as transferred by the LP pool, it reverts.
- Amount to be sent to trader is calculated based on constant product formula.

### SpaceRouter
#### AddLiquidity
- Router allows liquidity providers to add liquidity to LP pool.
- It prevents liquidity provider to send imbalanced liquidity.
- If liquidity provided is for first time, it accepts any amount.
  
#### RemoveLiquidity
- Router allows liquidity providers to remove liquidity from the pool and get tokens back.
- Liquidity providers first needs to give allowance to router to fetch LP tokens and send it to pool.

#### swapETHForSPC
- Allows trading ETH for SPC. 
- Traders need to send ETH to router contract and router contract forwards ETH to LP pool.

#### swapSPCForETH
- Allows trading SPC for ETH.
- Traders first needs to give allowance to router to fetch SPC tokens and send it to pool.


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
- The staking mechanism is offered by some of the protocols that allows users to stake their liquidity tokens and earn more tokens based on that. For that, users are encouraged to put LP tokens in the protocol and not in their wallets. The benefits of staking for the protocol is that they can lend the deposited liquidity based on LP tokens that are staked. This will help the protocol to earn from lending.
- The drawback for LP providers is that LP tokens will become inflationary which will result in it's less value(market price) and they won't be incentivized for depositing liquidity.
- The pseudocode for using staking functionality in code is https://solidity-by-example.org/defi/staking-rewards/. 
- It basically tracks `rewardPerTokenStored` and `updatedAt` and try to add rewards in each block. But it is calculated in gas efficient way.

## Testnet Deploy Information

| Contract | Address Etherscan Link |
| -------- | ------- |
| SpaceCoin | `https://goerli.etherscan.io/address/0x19066e52ac3144547F9ADaa056d1057fe19d2E92` |
| ICO | `https://goerli.etherscan.io/address/0xc12687a79342b17b08279c47a09939424b705487` |
| Router | `https://goerli.etherscan.io/address/0x583A34348ef232698e806d07Ae8C1076aaD3de24` |
| Pool | `https://goerli.etherscan.io/address/0xaD42c67e176BDba17A17691538c1891b2669bF83` |

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