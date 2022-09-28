https://github.com/0xMacro/student.kingofclubstroyDev/tree/56da370271130f72cf72dbc7942e1fb73774ba87/dao

Audited By: Diana

# General Comments

Wow! Very, very impressive work Jordan!

# Design Exercise

1. Nice method of non-transitive delegation. Check out Aave Token V3's here: https://github.com/bgd-labs/aave-token-v3

2. Yes, delegation requires a directed acyclic graph, which is very expensive and may cause the transaction to run out of gas.

# Issues

## **[L-1]** `buy` return value is not checked for success

You cannot assume that all marketplaces will be like your Mock Marketplace and never return false.

`marketplace.buy()` is an external call and may revert for any reason. `buyNFT` is not taking the return of this function into account and returning true. This will cause an unsuccessful tx to be registired as executed proposal.

Consider to check if the external call was success

```solidity
bool success = marketplace.buy{value : priceOfNft}(nftContract, nftId);
require(success, "NFT_BUY_FAILED");
```

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | -     |
| Vulnerability              | 1     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | -     |

Total: 1

Great job!
