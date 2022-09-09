# Crowdfund Project

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

#### ProjectFactory
- ProjectFactory should be able to create new projects. 
- It should emit an event on successful creation of project.
- Multiple projects can be registered and each of them can accept ETH i.e. are active concurrently.

#### Project
- The goal of Project is to raise funding. 
- Each project has the creator, the amount of ETH it needs to raise and corresponding NFTs to reward the contributors.
- The goal amount that needs to be raised can not be changed after creation.
- The goal amount of project should be more than 0.01 ETH.

#### Project contributions
- Anyone can contribute(including creator) to the project as long as it is active.
- Project is considered active if it's less than 30 days of it's creation or it is not canceled by the creator of the project.
- Minimum amount one needs to be contributed is 0.01 ETH. 
- If the project has already raised desired amount, no can can contribute further.
- The user receives 1 badge per 1 ETH contributed. 
- If the user has contributed 0.5 ETH, he won't receive any badge. But if he again contributes 1.2 ETH, then total contribution of ETH exceeded 1 ETH and hence 1 badge is awarded.
- The contributor can be anyone. If it is contract account, it should be aware of NFT standards and should implement `IERC721Receiver` interface.
- Force-fed ether are not considered towards contribution and should not be worry about.

#### NFT badge
- The NFT badge is minted and awarded to the user.
- User can send the NFT badge to other user at any time, even after the completion, cancellation or failure of project.
- Each project has it's separate NFT badges.

#### Canceling the project
- Only creator of the project can cancel the project if conditions listed below are satisfied.
  - Project is active i.e it hasn't reached desired goal and time is less than 30 days after the creation of the project.

#### Refund the contribution
- Any contributor including creator(if he has contributed) can claim the contribution if following conditions are satisfied.
  - Project has not reached the goal and 30 days since it's creation are passed.
  - He has contributed to the project.
- Project contract sends the full amount contributed by the contributor. There can't be partial withdrawals.

#### Withdraw the contribution
- Only Creator can withdraw funds from the Project contract if following conditions are satisfied:
  - Project has raised the amount desired.
  - The amount to withdraw is less than contributions made to the Project.
- Creator can withdraw partial amount also.
- Project contract sends the funds to creator.


## Code Coverage Report
<!-- Copy + paste your coverage report here before submitting your project -->
<!-- You can see how to generate a coverage report in the "Solidity Code Coverage" section located here: -->
<!-- https://learn.0xmacro.com/training/project-crowdfund/p/4 -->


## Design Exercise Answer
<!-- Answer the Design Exercise. -->
<!-- In your answer: (1) Consider the tradeoffs of your design, and (2) provide some pseudocode, or a diagram, to illustrate how one would get started. -->
> Smart contracts have a hard limit of 24kb. Crowdfundr hands out an NFT to everyone who contributes. However, consider how Kickstarter has multiple contribution tiers. How would you design your contract to support this, without creating three separate NFT contracts?

### Approach 1:
Instead of deploying three different contracts, I would make one single NFT contract which will have different properties based on tokenId. In above case, since we want 3 different tiers, we can map tiers to some number and ensure that the tokenId as input to some function will result in those 3 tiers. 

For ex: we can map tiers as 0 to Gold, 1 to Silver and 2 to bronze. Now, we can use modulo function as follows: 

`f(id) = id % 3`

The above function will always result value among 0,1,2 which stands for tiers and corresponding tokenId will have separate tiers depending on what outcome the function gives when tokenId is provided as input to it. Thus, there will be 3 `tokenURIs` corresponding to 3 categories.

### Approach 2:
Another approach is to use Multi-token standard which can behave as a combination of `ERC20` and `ERC721` token standard. Thus, we can have 3 different tokens which are non fungible among themselves. But for same type, there can be many number of them and they can be fungible among themselves. 

From the OpenZeppelin implementation,
```
// Mapping from token ID to account balances
    mapping(uint256 => mapping(address => uint256)) private _balances;
```
For each non-fungible token(distinct token ids), there can be multiple address holding multiple tokens of the same type.

## Useful Commands

Try running some of the following commands:

```shell
npx hardhat help
npx hardhat compile              # compile your contracts
npx hardhat test                 # run your tests
npm run test                     # watch for test file changes and automatically run tests
npm run lint-fix                 # run ESLint and write an automatable improvements to your code
npx hardhat coverage             # generate a test coverage report at coverage/index.html
REPORT_GAS=true npx hardhat test # run your tests and output gas usage metrics
npx hardhat node                 # spin up a fresh in-memory instance of the Ethereum blockchain
npx prettier '**/*.{json,sol,md}' --write # format your Solidity and TS files
```
