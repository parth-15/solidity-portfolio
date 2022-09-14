
https://github.com/0xMacro/student.Rahat-ch/tree/6ef45b4d73a8f493628c6be04a1e5e4661ccfda0/crowdfund

Audited By: Michael Azorin
# General Comments

Good job on your first project! Your code is well written and easy to follow and I was not able to find any major vulnerabilities. I was able to find a couple of technical mistakes within the cancel function. In future projects, you may want to implement a state function, which can make your code more readable, and keeps requirements for different functionality in one place. 

Consider adding comments to make your design choices easier to follow for users and auditors. Just make sure to use the [NatSpec format](https://docs.soliditylang.org/en/develop/natspec-format.html) for comments and function annotations you add to future projects. 

In your Hardhat tests, I noticed you checked whether the owner of a particular tokenId exists to check user NFT balances, if NFTs were successfully minted or transferred. You can use ERC721 balanceOf to determine the quantity of a certain NFT held by a particular address. This may be more direct than checking if owner of a particular tokenId exists. 


# Design Exercise

Using an ERC-1155 is an interesting way to solve this problem. There are other features that ERC-1155 brings as well, such as mixing tokens and NFTs. Can you think of how you could implement different NFT tiers using just ERC-721? Many popular NFT projects using ERC-721 are able to implement traits and tiers. This can be done using data stored in URIs or even within the NFT itself. 


# Issues

## **[Missing-Feature]** Code coverage report is missing in the README (1 point)

Each project requires proof that you generated a coverage report, and included the output in your README.md See the **Solidity Code Coverage** section of the Testing resources here: https://learn.0xmacro.com/training/project-crowdfund/p/4

## **[Technical-Mistake]** Creator can cancel twice (1 point)

A creator can call cancel to emit the ProjectCancelled event multiple times. This may cause a discrepancy for offchain applications that attempt to read when a project got cancelled. 

Consider adding a check to see if the project has already been cancelled.

## **[Technical-Mistake]** Creator can cancel after project is fully funded (1 point)

In `cancelProject()`, you are allowing the creator to cancel a project even after the project is fully funded. This opens up the vulnerability of creator taking all the money and not being heard from again. 

Consider this scenario. The project is fully funded within the first 30 days and the creator withdraws some or even all of the ETH in the project. The creator could then cancel the project before 30 days is up. As a result, the contributors will not be able to get all their ETH back (per the cancel/project failure requirement) because some or all the ETH has been emptied out of the project. 

If you did allow the project to be canceled within the first 30 days and the project is fully funded, you would need to ensure that the creator has not withdrawn any ETH.

Consider adding a require for !goalMet to the `cancelProject()` :

``` solidity
        require(!goalMet, "Goal has been met, cancellation not allowed");
```

## **[Q-1]** Unnecessary setting of storage variable `tokenId` to default value

Every variable type has a default value it gets set to upon declaration. Unnecessarily initializing a variable to its default value costs gas. This can be avoided as follows: 

For example: 

```solidity
address a;  // will be initialized to the 0 address (address(0))
uint256 b;  // will be initialized to 0
bool c;     // will be initialized to false
```

Consider not setting initial values for storage variables that would otherwise be equal to their default values.

## [Q-2] ContributorTokenAmount not needed, can save gas

This state variable requires storage and reads on every contribution. But you can get all the information you need from contributorToContribution. If you add the modulo by 1 ETH of previous contributorToContribution to the msg.value current ETH donation value then divide by 1 ether, you will get the number of NFTs to mint without having to read or store any additional variables. 

## **[Q-3]** Unchanged variables should be marked constant or immutable 

Your contract includes storage variables that are not updated by any functions and do not change. For these cases, you can save gas and improve readability by marking these variables as either `constant` or `immutable`. 

What's the difference? In both cases, the variables cannot be modified after the contract has been constructed. For `constant` variables, the value has to be fixed at compile-time, while for `immutable`, it can still be assigned at construction time.

Compared to regular state variables, the gas costs of `constant` and `immutable` variables are much lower. For a `constant` variable, the expression assigned to it is copied to all the places it is accessed and re-evaluated each time. This allows for local optimizations. `immutable` variables are evaluated once at construction time, and their value is copied to all the places in the code where they are accessed. For these values, 32 bytes are reserved, even if they would fit in fewer bytes. Due to this, `constant` values can sometimes be cheaper than `immutable` values. 

Consider marking unchanged storage variables as either `constant` or `immutable`.

In Project.sol, the following constructor-set variables can be marked as `immutable`: `goal`, `owner`, `expiration`  

## **[Q-4]** Enable solidity compiler optimizer 

Solidity opcode-based optimizer applies a set of simplification rules to the bytecode of the contracts to reduce gas cost on function calls. For more info check this link Consider enabling solidity optimizer with at least a low level of runs: 

```javascript
solidity: { 
  version: "0.8.9",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
}
```

# Nitpicks

## [N-1] Hardhat tests failing due to low project goal in setupFixture

I noticed that a couple of your hardhat tests were failing because your setupFixture deployed a Project with a funding goal of 1 ETH. With this setup, there are many scenarios you are unable to test. Consider using a higher ETH goal in your setupFixture. 

## [N-2] Require message for activeProject is misleading

activeProject tracks whether a project has been canceled or not, but the message coming from the failed require state around this variable is inconsistent. It should communicate, "This project has been cancelled." Failed is not quite correct. 




# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | 1 |
| Extra features             | - |
| Vulnerability              | - |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | 2 |

Total: 3

Good job!
