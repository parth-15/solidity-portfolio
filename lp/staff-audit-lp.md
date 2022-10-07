https://github.com/0xMacro/student.parth-15/tree/ce4d08424da4972f9ed238219459ed41ec4954db/lp

Audited By: Rares Stanciu

# General Comments

Excellent job, Parth!

You've conquered this difficult project with 0 vulnerabilities and very clean code.

I have a suggestion for handling the approval transaction on the frontend: I think it's best first to check the current allowance and see if it's enough for your action. You can skip calling a redundant `approve` if it's enough. And try to avoid setting the allowance to more than it's needed.

I'd like to wish you good luck in the Audit Apprenticeship! I have no doubts that you will conquer that as well.
You have proved to be dedicated to learning and improving while also helping others do the same.

Keep up the excellent work, and never stop learning!

# Design Exercise

A very good description of the staking mechanism and its drawbacks!
I might add that a different ERC20 token is usually used for staking rewards, not to lower the value of the LP token (basically taking value from LPs who don't stake and giving it to LPs who stake).

# Issues

## **[Extra-Feature-1]** `skim`

Your `SpaceLP` contract contains a feature for claiming any funds sent to the pool but not used yet for adding liquidity (the `skim` function).

However, the project specs do not require such a feature, and the function is not used anyway.

Consider removing the `skim` function.

---

## **[Q-1]** Minimum liquidity

Uniswap does this to prevent the value of a single unit of LP token from becoming so valuable it becomes prohibitively expensive to interact with the protocol.
We do not need this for an ETH-SPC pool because ETH, SPC, and the LP Token (assuming it inherits from OZ’s ERC20) all use 18 decimals, so the value of a single unit of either asset will be infinitesimally small.

## **[Q-2]** Pool's `deposit` return value not consistent

The `SpaceLP` contract returns the amount of LP tokens minted after adding liquidity. For cases when the user adds additional liquidity, the returned value is the exact number of LP tokens received by the user in return.
However, when adding the initial liquidity, the returned value is greater than the actual number of LP tokens received by the user due to the `MINIMUM_LIQUIDITY` being burned.

Consider staying consistent or adding a comment to that function (and to the router's `addLiquidity` function) so that it is clear what the returned value represents.

## **[Q-3]** Checks-Effects-Interactions pattern

In `SpaceLP`'s `deposit` function, you transfer the LP tokens before updating the state variables.
Although this does not expose the contract to any reentrancy attack, it's best to stick to following the Checks-Effects-Interactions pattern everywhere to create a habit out of it and avoid any potential future mistakes.

## **[Q-4]** Pool's `swap` function can be simplified

You can use the `quoteSwapPrice` return value inside the `swap` function to compute the amount of ETH/SPC that needs to be sent back to the user since the code is the same.
This allows your contract to become smaller, reducing operational gas costs and making it more readable by removing duplicate lines of code.

### **[Q-5]** Events are not implemented

Though they are not an explicit requirement in the spec, it is a good practice to include events in your contract. Without them, it can be hard for off-chain tooling to monitor status changes of the projects. In addition, they're useful for front end applications interacting with your contracts if you eventually implement them.

## **[Q-6]** Redundant check

In `SpaceRouter.sol`, on lines 75-78, we have the following check:

```solidity
require(
    lpToken <= spaceLP.balanceOf(msg.sender),
    "not enough lp tokens"
);
```

However, the `ERC20.transferFrom` function already does this check to ensure people do not transfer more tokens than they own.

Consider removing the checks to save up some deployment and operational gas.

# Nitpicks

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | 1     |
| Vulnerability              | -     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | -     |

Total: 1
