
Audited By: Lily

# General Comments

Good functionality! Your code follows most of the spec requirements in a clear manner. You have some code quality issues which I noted below.


# Design Exercise

Good starting answer for Q1! You'll need some additional data structures in order to keep track of who delegated to who, possibly a `mapping delegating(address => address);`. You'll also need additional logic to update the delegated voting power when an address has successful proposals. 

For Q2 hopefully user `A` would trust user `B` to be a trustworthy person to handle their vote. The problem with transitive voting that solidity devs should be more concerned about is how to handle long voting chains without running out of gas. For example, if `A` delegates to `B` who delegates to `C` who delegates to (... make this really long), how would you design a system that could both be correct and not run out of gas? Especially when a graph could contain cycles?

# Issues

## **[L-1]** `buyNFTFromMarketplace` does not check if purchase was successful 
`marketplace.buy()` is an external call whose interface returns a 'success' flag. DAO.sol's `buyNFTFromMarketplace` does not check this return flag. Your mock NFT contract always returns true, but, other NFT marketplaces could return false instead of reverting on a failed buy. This will cause an unsuccessful purchase to be registered as an executed proposal. 

Consider to check if the external call was success:
```solidity 
bool success = marketplace.buy{value: nftPrice}( nftContract, nftId ); require(success, "NFT_BUY_FAILED");
```

## **[L-2]** Users who purchase membership before proposal proposed in same block are unable to vote on it
The project spec states: "DAO members who join after a proposal is created should not be able to vote on that proposal." DAO.sol doesn't implement this. Instead the code requires that a member needed to have purchased a membership at least the *block* before instead of just a transaction before. This is due to how DAO.sol uses the `block.timestamp` for both membership joining and proposal creation with the comparison `membershipCreationTime[signer] > proposal.startTime`. This logic will prevent a user who joined the transaction before a proposal in the same block from being able to vote on that proposal. 

Consider: keeping track of the earliest proposal nonce a member can vote on instead of using `block.timestamp`. 

## **[Technical-Mistake-1]** Quorum should be 25% of total members
The project spec states that a quorum of 25% is needed, but instead of counting the number of members who voted for a proposal, you are counting the total voting power and comparing it to the total number of members at the time of proposal creation. This is against the spec.

Consider: using the number of votes when checking if the quorum is met, instead of the sum of the voting powers of those votes.

# Nitpicks

## [Code Quality - 1]
The functions `castBulkVoteBySignature()`, `castVoteBySignature()`, and `vote()` all have repeated code between them which could've been combined into a helper function. Having the code all in one place allows for an easier auditing process as the code surface is smaller. Also, deploying this duplicate code results in a higher than necessary deployment cost as you pay per byte of bytecode.

Consider: combining these functions for a cleaner reading experience and for reduced deployment costs.

## [Code Quality - 2]
You have many unnecessary require statements!
Unneeded require statement checks in DAO.sol:
- Lines 114, 181, 223: `block.timestamp < proposal.startTime`
	- This will only trigger during the same block as the proposal, but, that case should be fine to vote on
- Lines 116, 186, 230: `proposal.executed`
	- The check `block.timestamp < proposal.startTime` covers this case making this check unnecessary 
- Line 443: `proposal.nonce >= 1`
	- You already check this in the `executeProposal()` section
Running these unnecessary checks will cause your users to spend gas that they could otherwise save. 
Consider: removing the unnecessary checks.



# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | - |
| Vulnerability              | 3 |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | 2 |

Total: 5

Good work!
