## General Comments

This is solid code Parth, you caught almost every edge case or potential exploit I could think of!  Very good use of checks/effects/interactions, and generally very thorough.  I've included quite a bit "code quality" feedback items only because I couldn't find much else and I wanted to provide an audit that might be helpful anyway.  If you want to discuss any hit me up on Discord! :smile:

-----------------------------------------------------------------------------------

## [H-1] Any proposal which results in ETH transfered to DAO will fail

  Per the spec the proposals should allow for any function on any contract to be called, which means that a function selector may or may not be present, or a non-existent function could be specified/called. However because no `receive` or `fallback` function is defined, the DAO is unable to receive ETH and any proposal that would result in its doing so will fail.

  A notable example here is the DAO's own `execute` function- if a proposal were to try to execute another proposal it would fail as a result of lines 346-349:

```
(bool success, ) = msg.sender.call{value: EXECUTION_REWARDS}("");
if (!success) {
    revert ExternalCallFailed();
}
```

  Consider adding a `receive` function to allow the contract to receive ETH

-----------------------------------------------------------------------------------

## [L-1] Contract doesn't confirm NFT purchase successful

  On the last line of the `buyNFTFromMarketplace` function is:

  `marketplace.buy{value: nftPrice}(nftContract, nftId);`

  Consider adding a check afterwards to confirm that the DAO actually received the NFT

## [L-2] Unsafe use of `address(this).balance`

  Lines 345-350 contain:

```
if (address(this).balance >= 5 ether) {
    (bool success, ) = msg.sender.call{value: EXECUTION_REWARDS}("");
    if (!success) {
        revert ExternalCallFailed();
    }
}
```

  Because the contract cannot prevent receiving ETH as a result of an external (potentially malicious) contract doing a `selfdestruct` call the above call could transfer rewards to users when it otherwise shouldn't.  In this case the result of the exploit isn't dangerous, however as a general pattern consider not using `address(this).balance` in logic and instead use internal record keeping

-----------------------------------------------------------------------------------

## [Q-1] Unnecessary/invalid timestamp check

  Line 180-185 contains:

```
if (
    block.timestamp < proposal.startTime ||
    block.timestamp > proposal.endTime
) {
    revert ProposalNotActive();
}
```

  Because there's an earlier check to make sure the `proposalId` is valid it is not possible for `block.timestamp < proposal.startTime` to ever evaluate to `true`. Consider removing that check.

## [Q-2] Unnecessary/invalid executed check

  Lines 186-188 contain:

```
if (proposal.executed) {
	revert ProposalAlreadyExecuted();
}
```

  Because you immediately confirm prior to this (see **Q-1**) that the proposal is active it is not possible for it to have been executed at this point and the `revert` will never happen. Consider removing this check

## [Q-3] Duplicated logic vote and voteBySignature

  The checks and effects in the `vote` function are duplicated in the `voteBySignature` function. This is generally not ideal because it increases contract bytecode size, it's prone to bugs (modifying code in one place and forgetting the other) and its difficult for future devs to maintain (not relevant in this case).

  Consider encapsulating the vote checks/effects/interactions in a single function and having both your `vote` and (on line 169, after you've verified the off-chain signature) your `voteBySignature` functions defering to it.

  Note that **Q-1** and **Q-2** exist in both vote functions.

## [Q-4] Unnecessary variable initialization in constructor

  Lines 51-52 and 270-275 contain:

```
	/// @dev auto-incrementing id stored in each proposal for unique identifier
    proposalCounterId = 1;
    
    ...
    
    uint256 proposalId = hashProposal(
        targets,
        values,
        calldatas,
        proposalCounterId
    );
```

  You can remove the initializer altogether (and subsequently your constructor as well!) by changing line `274` to simply: `++proposalCounterId` (if you did so you'd also need to change line `277` to: `proposal.nonce = proposalCounterId++;`

## [Q-5] Duplicated logic in castBulkVotesBySignature

  Instead of duplicating logic found in `castVoteBySignature` consider instead just calling that function inside your for-loop and allowing it to be the canonical source of that logic (similar issue to **Q-3**)

-------------------------------------------------------------------------------------

### Nitpicks
  1. You have quite a few duplicated if-then-revert checks, consider leveraging modifiers to abstract that away and to improve readability of your code
  2. It's unnecessary to store `endTime` in the proposal, consider removing it to reduce storage size
  3. Consider using simply `block.chainid` in constructor to find the chain ID
