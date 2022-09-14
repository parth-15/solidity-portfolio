
https://github.com/0xMacro/student.parth-15/tree/21082ce50a5862817da93d459d3bbaa3c928212c/crowdfund

Audited By: Jamie

# General Comments
Excellent work here Parth. This was a pleasure to audit. I appreciate the good documentation in the `README.md`, the minimal coding style, and the smart use of modifiers. You have good testing coverage, and even implemented a test reentrancy `Attack` contract to verify your logic. I did spend some time on this one, but I was only able to find minor issues. You are absolutely on-track!


# Design Exercise
Good thinking here. Using the NFT ID field is certainly a concise, straightforward way to encode contribution tiers. Keep in mind that the contract will be handing out more bronze NFTs than gold ones, for example. So this would mean that your contract would need to keep track of three variables (something to the order of `nextGoldId`, `nextSilverId`, `nextBronzeId`) at mint time. But this is still more storage efficient than another common answer students propose: for the contract to keep a `mapping(NFT ID => NFT Tier)` in their contracts.

# Issues

## **[Q-1]** Gas optimization in `claimContributions()`
In line 90 of `Project.sol` we have:

```solidity
require(contributions[msg.sender] > 0, "No contribution");
require(status == Status.Failed, "Project active or completed");
uint256 amount = contributions[msg.sender];
require(contractBalance < AMOUNT_TO_RAISE, "Goal met");
contractBalance -= amount;
contributions[msg.sender] -= amount;
```

Since the caller has no ability to specify the amount of ETH to be withdrawn, by the end of this function `contribution[msg.sender]` will always equate to zero. Hence, calling `-=` on a storage variable at the end is not optimal.

Consider:

Saving a marginal amount of gas with the more explicit statement of:
```solidity
contributions[msg.sender] = 0;
```

## **[Q-2]** Use NatSpec format for comments

Solidity contracts can use a special form of comments to provide rich documentation for functions, return variables and more. This special form is named the Ethereum Natural Language Specification Format (NatSpec).

It is recommended that Solidity contracts are fully annotated using NatSpec for all public interfaces (everything in the ABI).

Using NatSpec will make your contracts more familiar for others to audit, as well as making your contracts look more standard.

For more info on NatSpec, check out [this guide](https://docs.soliditylang.org/en/develop/natspec-format.html).

Consider annotating your contract code via the NatSpec comment standard.

# Nitpicks
## **[N-1]** `deployer` is the default connection in the test file
Perhaps this is a style choice of yours, but I thought I would note in anyway: the default connection in hardhat is always the first `SignerWithAddress` unless explicitly deployed by another signer.

This means, a statement like this:
```ts
await project
  .connect(deployer)
  .contribute({ value: ethers.utils.parseEther("1") });
```
can be reduced to:
```ts
await project
  .contribute({ value: ethers.utils.parseEther("1") });
```

## **[N-2]** Very small instant of time where creator cannot claim
In line 86 of `Project.sol` we have the following:
```solidity
if (status == Status.Active && block.timestamp > ROUND_END_TIME) {
  status = Status.Failed;
}
```
If is unclear if your contract active time is `[t=0, t=30 days)` or `[t=0, t=30 days]`, but based on the `onlyActive` modifier require statement:
```solidity
require(block.timestamp < ROUND_END_TIME, "Round ended");
```
It appears to be the former. This leaves the project creator unable to claim if `block.timestamp` is exactly `ROUND_END_TIME`. For completeness, consider changing the the `>` to a `>=`.

# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | - |
| Vulnerability              | - |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | - |

Total: 0

Great Job!
