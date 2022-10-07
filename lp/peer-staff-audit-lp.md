https://github.com/0xMacro/student.patnir/tree/8417ccb38ace197a9934187e67ccfe97d243c4c0/lp
Audited By: brianwatroba

# General Comments

Great effort. This is by far the most difficult project of the fellowship (which is why we allow more time). But I also think it has the most to teach us. Liquidity pools are truly innovative and fascinating! You made a really good effort to implement all the requirements of the spec and think through the systems design yourself. You included some unique solutions that weren't mirrored from Uniswap, which tells me you thought this through individually, which I give you a lot of credit for.

Your approach on managing slippage was interesting! I liked how you allow a user to specify a minimum "amount out" and then actually run through all the `swap()` logic, and revert in the Router if the returned amount is less than the minimum accepted. This is very "Uniswap" in spirit, in that you optimistically perform operations and revert if required conditions aren't met. An alternative, to contrast, might be to first calculate the amount a user would "get out" based on their `swap()` call in the Router, and revert right away if it's less than the accepted minimum.

Great work on preventing re-entrancy and being careful about the order of operations. I think you did a good job of thinking through the edge cases and making sure you were safe.

# Design Exercise

Question #1: I like the questions you're thinking about! Providing additional incentive is key to attracting new liquidity and fostering community/reward amongst LPs. This is partly why Uniswap released their governance token, and how Sushi Swap gained users early on.

To answer your question: why would a Liquidity Pool issue a separate reward token? Aren't the LP tokens enough?
It's a good question. The LP tokens we use in this project are meant to represent your claim to a certain (fair) proportion of the pool's assets based on how much liquidity you provided. This is--in a sense--a reward for participating because you also have claim to fees accrued in the pool.

What this design question is getting at: in addition to earning fees, what other rewards could we give to LPs to incentivize them to provide liquidity? Examples might be governance tokens (voting on protocol changes), separate participation tokens to just show your involvement (like we did in the Crowdfunder project), etc. The goal would be to involve and attract more LPs and provide them more value for participating in the pool.


# Issues

## **[H-1]** User can drain pool at favorable exchange rate, both reserve varariables not updated in SpaceLP.sol's `swap()`

In your SpaceLP's `swap()` function, you include the following caluclation to determine the "amount out" of an asset based on an amount sent in:

```solidity
uint256 spcOut = cSpc - (kLast / (cEth + ethInSubFee)); // for SPC
uint256 ethOut = cEth - (kLast / (cSpc + spcIn)); // for ETH
```

However, in the next operation, you only update one of the asset's reserves (whichever one you're sending out). This means that the other reserve variable is not updated, despite its balance having changed.

When you call `swap()` a second time, one of the reserve variables is now out of date, and the exchange rate will be incorrect. A malicious actor could repeatedly call `swap()` for the same "asset out" with a low value (relative to pool size) to drain the entire pool at an exchange rate equal to the initial liquidity provided, despite the assets' relative supply changing on each swap.
Consider updating both reserve variables in your `swap()` function.

## **[M-1]** Router’s `addLiquidity()` function leaves excess ETH in the Router

When a user calls your `addLiquidity()` function, they send an amount of ETH that they'd like to contribute to their liquidity stake in the pool. When your router determines the right amounts of ETH/SPC to subsequently send into the pool, the amount sent to the pool may be less than `msg.value`. This occurs when the ratio of ETH:SPC sent in doesn't match the right proportions needed for the pool. You calculate the correct amounts to send to the Pool on line 55, which may be less ETH than sent to the Router. Since you don’t refund the difference, the excess ETH will end up locked in your Router.

See how Uniswap does the refund [here](https://github.com/Uniswap/v2-periphery/blob/master/contracts/UniswapV2Router02.sol#L99).

Consider sending any excess ETH back to the caller.

## **[M-2]** K value is not updated after swap

Your SpaceLP.sol `swap()` function relies on the `lastK` value being equal to the value of `spcReserve * ethReserve` in order to calculate the correct "amount out" of either asset. However, in your swap functions you do not update `lastK`; it is only updated in the `deposit()` and `withdraw()` functions. If lots of swaps happen without any liquidity being added or removed (and in turn updating `lastK`), `swap()` will use an out of date k value as fees accumulate in the pool. This can be pretty bad, depending on how many fees accumulate.

Consider recalculating and storing the new k value in your `swap()` function.

## **[Extra feature-1]** Reentrancy guard not necessary for Router's `swapETHForSPC()` and `swapSPCForETH()` functions

You include a `lock` modifier in your Router's `swapETHForSPC()` and `swapSPCForETH()` functions. I’m glad to see that you’re being attentive to security and keeping an eye out for reentrancy risks.

However, these functions do not have any modifiable internal state, and the only external calls they make are to `swap()` on your Pool contract, which also has a reentrancy guard, so reentrancy is not possible.

Consider removing your reentrancy guards on your Router's swap functions to save on gas costs.

## **[Technical Mistake]** Router’s `addLiquidity()` function does not account for feeOnTransfer tokens such as SPC

Your `addLiquidity()` function calculates optimal token and ETH values to send to your Pool contract.

You then transfer transfer those values in and call `deposit()`. Now, if tax is on for SpaceToken then the amount received on the Pool contract is less than what you had calculated in your Router. The pool contract will calculate LP shares to be minted based on this lesser amount and as we take minimum you get shares as per this decreased amount, losing the equivalent portion of ETH transferred.

For example, assume the following state of the pool:
ETH: 100
SPC: 500
totalSupply = 1000

User calls `addLiquidity()` with 50 ETH and 250 SPC.

However, because of the 2% SPC transfer tax, only 245 SPC makes it to the pool. And, crucially, because the pool uses this logic to calculate LP tokens:

```solidity
liquidity = min(
    (diffSpc * (totalLp)) / beforeSpc,
    (diffEth * (totalLp)) / beforeEth
);
```

it will calculate `245 * 1000 / 500 = 490` is less than `50 * 1000 / 100 = 500`, and only mint `490` LP tokens. `490` LP tokens is the same they would have received if `ethAmountIn = 49` and `spcAmountIn = 245`, so that `50 - 49 = 1` ETH is effectively taken from the user and donated to the pool.

Consider checking for the tax and subtracting away 2% from the SPC the pool will receive when calculating the correct amount of SPC and ETH to add in `addLiquidity()`.

# Nitpicks

- Consider using an interfaces for your contracts and defining custom errors and events there, and inherit them accross your contracts that call each other. This allows you to cut down on deployment costs vs. inheriting an entire contract's code in another. This is a common pattern for published contracts to help with separation of concerns, readability, and gas costs.
- Helper functions for setting the reserves might be useful to have in your Pool contract. For example, `setReserves(uint256 _spcReserve, uint256 _ethReserve)` could be useful for testing and for updating the reserves after a swap.
- You might also consider a `quote()` function that calculates the "amount out" of an asset given the current state of the pool.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | 1     |
| Vulnerability              | 7     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | 1     |

Total: 9
Good effort!
