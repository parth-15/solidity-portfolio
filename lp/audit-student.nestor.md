
https://github.com/0xMacro/student.parth-15

Audited By: Nestor

# General Comments
- Nice job on the project Parth. Very well structured code. I was not able to find any major vulnerabilities. I just made a couple of suggestions.

# Design Exercise
- Good answers Parth.

# Question / Suggestions

## **[Q-1]** TODO replace requires by custom reverts
The contract contains many requires, and you could achieve the same by using custom errors, and also they are more gas efficient.

Consider:
Replace require by custom reverts.

Source:
https://ethereum.stackexchange.com/questions/123381/when-should-i-use-require-vs-custom-revert-errors

## **[Q-2]** ICO `pause` and `resume` fundraising could be merged
The functions 
function pauseFundraisingAndSpcRedemption() ...
and
function resumeFundraisingAndSpcRedemption() ...
could be mixed into one function without adding complexity nor making it more gas expensive.

Consider:
Combine both functions into one.

## **[Q-3]** Remove unnecesary parethesis
In line 98 of `SpaceLP.sol` you add an unnecesary parenthesis:
```solidity
uint256 spcToBeAdded = spcTransferred - (spcTransferred) / 100;
```
Consider:
Remove unnecesary parenthesis.