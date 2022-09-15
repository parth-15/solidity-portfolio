# ICO Project

## Project Setup

Install all needed dependencies:

```bash
npm install
```

Ensure your project is setup correctly by running:

```bash
npx hardhat compile
```

Now you're all setup to begin writing tests and smart contracts! Check out the `package.json`'s scripts section for useful commands

## Technical Spec

<!-- Here you should list the technical requirements of the project. These should include the points given in the project spec, but will go beyond what is given in the spec because that was written by a non-technical client who leaves it up to you to fill in the spec's details -->

### SpaceCoin Token
- Maximum total supply of SpaceCoin token is `50_000`.
- The decimals of SpaceCoin token is `18`.
- On deployment, `150_000` tokens should be minted to `ICO` contract and `350_000` tokens should be minted to `treasury` contract. 
- `treasury` should be simple address variable stored at the time of construction of contract.
- `owner` of the SpaceCoin contract should be simple address variable. `owner` of ICO and SpaceCoin contract can be same.
- `owner` and `treasury` can't be changed after construction of contract.
- `owner` can set the transfer tax on transfer of SPC tokens from one address to another. Initially, transfer tax is not enabled.
- The transfer tax can be paused/unpaused by the owner at any time.
- No other addresses can pause/unpause transfer tax, not even the treasury.
- The percentage value of transfer tax is `2` and can't be changed.
- There shouldn't be transfer tax on initial mint. The tax needs to be applied only on transfers.

### ICO contract
- The goal of ICO is to raise `30_000` ether.
- `owner` of ICO contract is the one that deploys it. `owner` can't be changed later.
- Only `owner` can pause fundraising and SPC redemptions. Both of these(fundraising and SPC redemptions) can be enabled and disabled simultaneously.
- Only `owner` can advance ICO phase. `owner` can advance phase at any time he/she wishes and there is not any condition for that.
- `owner` can move from `SEED` phase to `GENERAL` and from `GENERAL` to `OPEN` phase by calling `advancePhase` function and passing the desired phase. 
- `owner` can't advance phase after reaching `OPEN` phase and it should revert.
- Only `onwer` can add private contributors to the ICO contract. Once added, `owner` can't remove private contributor once added. 
  
  ### Contribute

- Contributions can only be done when ICO is active and fund raising and SPC redemption is not paused.
- The ICO will accept contributions in three phases: `SEED`, `GENERAL` and `OPEN`.
- Each of the three phases has different conditions on who can contribute, individual contribution limit and total contribution limit.
- During `SEED` phase, only private contributors which is earlier added by `owner` can contribute. Maximum total allowed contribution is `15000` ether and individual contribution limit is `1500` ether.
- During `GENERAL` phase, ICO is open for general public. Maximum total allowed contribution is `30000` ether and individual contribution limit is `1000` ether. The individual and total allowed contribution is including the contribution made in previous(i.e. `SEED` phase). For ex: If someone has contributed `1400` ether in `SEED` phase, he can't contribute anything in `GENERAL` phase because individual contribution limit of `GENERAL` phase is `1000` ether.
- During `OPEN` phase, the individual contribution limit should be removed. But the total contribution limit should remain at `30_000` ether.
   ### Redemption 
- During `OPEN` phase, ICO contract can release `SpaceCoin` tokens at the exchange rate of `5` SPC to `1` ether. This can be claimed by the contributors who have contributed to the ICO. The release can only be done if fundraising and SPC redemption is not paused.
- During redemption, transfer tax occurs if it is enabled.


## Code Coverage Report

<!-- Copy + paste your coverage report here before submitting your project -->
<!-- You can see how to generate a coverage report in the "Solidity Code Coverage" section located here: -->
<!-- https://learn.0xmacro.com/training/project-crowdfund/p/4 -->
File            |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
----------------|----------|----------|----------|----------|----------------|
 contracts/     |      100 |    95.45 |      100 |      100 |                |
  Ico.sol       |      100 |       95 |      100 |      100 |                |
  SpaceCoin.sol |      100 |      100 |      100 |      100 |                |
All files       |      100 |    95.45 |      100 |      100 |                |

## Design Exercise Answer

<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->

> The base requirements give contributors their SPC tokens immediately. How would you design your contract to vest the awarded tokens instead, i.e. award tokens to users over time, linearly?
- Instead of allowing users to redeem the token immediately and only allowing them to redeem the vested amount, we can use the approach used by Synthetix protocol for giving staking rewards. So, the protocol keep track of block at which user contributed and there is multiplier(generally constant number) at which the rewards are awarded per block. So, if multiplier is `0.001` and and we contributed at block `X`. Then at `X + 30000` block, we can withdraw `30000 * 0.001` tokens. The challenge here is how to handle multiple contributions by the user and how to handle that efficiently. Need to deep dive into this. The related code can be found [here](https://solidity-by-example.org/defi/staking-rewards/).

## Testnet Deploy Information

| Contract  | Address Etherscan Link |
| --------- | ---------------------- |
| SpaceCoin | `https://goerli.etherscan.io/address/0x35f0DeC22F941213ADEc52a55Cccb0dded04Ec0F`           |
| ICO       | `https://goerli.etherscan.io/address/0xc8fe4dae6b7dcb33f1302891dfab66fa2f3ca9f3`           |

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
