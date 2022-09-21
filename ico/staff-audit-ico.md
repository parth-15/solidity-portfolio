https://github.com/0xMacro/student.parth-15/tree/1fdb5b7dbd3fb22938f14e5f9b28c741a95b22db/ico

Audited By: Diana

# General Comments

Fantastic job, Parth! Review the code quality issues listed, and keep up the great work!

# Design Exercise

Interesting answer! It would be great if you could expand on this more or provide some pseudocode. Normally, a vesting schedule is around 1-4 years with or without a cliff. One can claim their tokens gradually throughout this period ance once the schedule is over, all of their allocated tokens are claimable. This is different than staking where stakers continuously receive rewards for how long and how much they stake.

# Issues

## **[Q-1]** Unused variable ICO_GOAL

Unused storage variables and functions needlessly increase the cost of deployment and confuse readers of the contract.
Please remove them if they are not used.

## **[Q-2]** Immutables should not be capitalized

Constants should be written in all capital letters, while immutables should be written in mixed case, per https://docs.soliditylang.org/en/v0.8.9/style-guide.html#local-and-state-variable-names

## **[Q-3]** Unnecessary setting of storage variables to default values

Every variable type has a default value it gets set to upon declaration. Unnecessarily initializing a variable to its default value costs gas. This can be avoided as follows:

For example:

```solidity
bool public isTransferTaxEnabled;                 // will be initialized to false
bool public isFundraisingAndSpcRedemptionPaused;  // will be initialized to false
Phase public currentPhase;                        // will be initialized to Phase.SEED
```

Consider not setting initial values for storage variables that would otherwise be equal to their default values.

## **[Q-4]** Checks, effects, interactions pattern not followed

In the the contract `Ico.sol` function `redeemToken()` the external interaction of transferring spaceCoin is performed before the effect of emitting the corresponding event. Events are easy to overlook as effects, but they should come before interactions. It is better to get into the habit of always working this way, even in cases such as this where no vulnerability arises from emitting the event after the interaction.

## **[Q-5]** Use NatSpec format for comments

Solidity contracts can use a special form of comments to provide rich documentation for functions, return variables and more. This special form is named the Ethereum Natural Language Specification Format (NatSpec).

It is recommended that Solidity contracts are fully annotated using NatSpec for all public interfaces (everything in the ABI).

Using NatSpec will make your contracts more familiar for others to audit, as well as making your contracts look more standard.

For more info on NatSpec, check out [this guide](https://docs.soliditylang.org/en/develop/natspec-format.html).

Consider annotating your contract code via the NatSpec comment standard.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | -     |
| Vulnerability              | -     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | -     |

Total: 0

Great job!
