# DAO Project

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
<!-- Here you should list your DAO specification. You have some flexibility on how you want your DAO's voting system to work and Proposals should be stored, and you need to document that here so that your staff micro-auditor knows what spec to compare your implementation to.  -->

- Write a governance smart contract for a decentralized autonomous organization (Collector DAO) whose aim is buying valuable NFTs.

### Membership

- Allows anyone to buy a membership for 1 ETH.
- The membership fee should strictly be 1 ETH.
- Membership can't be purchased more than once. 
- Voting power of newly created member is `1`.

### Proposal Creation

- Only members can create governance proposals.
- Proposals include series of arbitrary function calls to execute.
- Proposals contains target addresses, value of ETH to send to those addresses and calldatas for that addresses.
- Name of function to be called is included in calldata.
- The minimum length of function to be executed in proposal should be 1.
- All the length of array should be equal.
- It is also possible to propose with similar set of targets, values and calldatas.
- So, I have used auto incrementing ID (`proposalCounterId` in code) to generate unique hash for each proposal.
- The time for voting on proposal starts from the same block on which proposal is proposed.
- Members can vote on proposal till 7 days(included) after the proposal is proposed.
- Proposal struct notes the member at time of proposal creation to maintain correct calculation in quorum.
- It should be possible to create proposal with identical set of proposed functions.
- The proposal's data should not be stored in the contract's storage. Instead, only a hash of the data should be stored on-chain.


### Proposal Voting

- Only members can vote on proposal.
- Member should not be able to vote on invalid proposal id. 
- Voting window is for 7 days(inclusive) after the project gets created.
- Member who has already voted can not vote again on the proposal.
- Members who have joined after the proposal is created can't vote on proposal.
- Members can't vote on executed proposal.
- Member can vote "yes" or "no" to the proposal.

### Proposal Passing

- Proposal is considered passed if voting period is over, `25%` quorum has reached and there are more yes votes than no votes.
- Quorum considers both the member who votes "yes" and "no".
- `25%` quorum is inclusive and it should strictly be more than or equal to `25%`.

### Execution of Proposal

- Anyone can execute the proposal if it is passed.
- If any of the proposed function fails during execution of proposal, entire transaction should be reverted.
- DAO incentivizes the address which executes the proposals rapidly by successfully offering 0.01 ETH if execution is successful.
- If DAO's balance is less than `5 ETH`, executor is not rewarded.
- The DAO's balance is checked after all the proposed function calls are completed.
- If proposal is successfully executed before, it should not be executed before.
- If proposal is successfully executed, voting power of creator increases by `1`. 

### EIP-712 Voting through Signatures

- A function should exist that allows any address to submit a DAO member's vote using off-chain generated EIP-712 signatures should exist on the contract.
- All the rules that apply to general voting function should apply to signer who signs the transaction.
- Another function should exist that enables bulk submission and processing of many EIP-712 signature votes, from several DAO members, across multiple proposals, to be processed in a single function call.
- If any one of the signature failed to verify, then the function should revert. It should also emit an event telling which vote failed to verify.

### Implementation details

- A standardized NFT-buying function called `buyNFTFromMarketplace` should exist on the DAO contract so that DAO members can include it as one of the proposed arbitrary function calls on routine NFT purchase proposals.
- Even though this DAO has one main purpose (collecting NFTs), the proposal system should support proposing the execution of any arbitrarily defined functions on any contract.



## Code Coverage Report
<!-- Copy + paste your coverage report here before submitting your project -->
<!-- You can see how to generate a coverage report in the "Solidity Code Coverage" section located here: -->
<!-- https://learn.0xmacro.com/training/project-crowdfund/p/4 -->
File                     |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-------------------------|----------|----------|----------|----------|----------------|
 contracts/              |      100 |    82.08 |      100 |    92.26 |                |
  DAO.sol                |      100 |    83.67 |      100 |    93.66 |... 297,319,382 |
  INftMarketplace.sol    |      100 |      100 |      100 |      100 |                |
  MockNftMarketplace.sol |      100 |     62.5 |      100 |    76.92 |       24,45,49 |
 contracts/test/         |      100 |      100 |      100 |      100 |                |
  DAOHelper.sol          |      100 |      100 |      100 |      100 |                |
All files                |      100 |    82.08 |      100 |    92.31 |                |

## Design Exercise Answer
<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->
> Per project specs there is no vote delegation; it's not possible for Alice to delegate her voting power to Bob, so that when Bob votes he does so with the voting power of both himself and Alice in a single transaction. This means for someone's vote to count, that person must sign and broadcast their own transaction every time. How would you design your contract to allow for non-transitive vote delegation?


- To implement non-transitive vote delegation, we can keep mapping of voting power of user and voting power that is delegated to user. When user delegates his/her voting power to some other user, the voting power of user(sender) is added to delegated to voting power of recipient. The caveat of implementing non-transitivity here is user can't delegate the voting power delegated to him/her to other users. He can only delegate his original voting power to other users.

```solidity
mapping(address => uint256) public votingPower;
mapping(address => uint256) public delegatedVotingPower;

function delegate(address recipient) public {
  delegatedVotingPower[recipient] += votingPower[msg.sender];
}

```

> What are some problems with implementing transitive vote delegation on-chain? (Transitive means: If A delegates to B, and B delegates to C, then C gains voting power from both A and B, while B has no voting power).

- The problem with implementing transitive vote delegation on-chain is if user wants to delegate the power to `B` and if `B` delegates all power to `C`, then `C` will also get power of `A` which may not be acceptable to `A`. So, in this case, user needs to put trust of `B` that `B` will only delegated power to trusted entity and `A` can't control to whom `B` is delegating.

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
