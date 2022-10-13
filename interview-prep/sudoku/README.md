
# Sudoku

## High Severity Issues

**[H-1]** `challengeReward.solved` not getting updated in storage in `claimReward` function.

In `claimReward` function of `SudokuExchange.sol`:

```solidity
    ChallengeReward memory challengeReward = rewardChallenges[address(challenge)];
        challengeReward.token.transfer(address(this), challengeReward.reward);
        challengeReward.solved = true;
```

The state `solved` is only updated in memory and not in storage. So, it is possible to reuse the solution again and again.

**[H-2]** Reentrancy vulnerability in `claimReward` function

In `claimReward` function, checks-effects-interactions pattern is not followed. It is possible to reenter.

**[H-3]** `claimReward` function transfers token to `SudokuExchange` and not solver of sudoku.

In `claimReward` function of `SudokuExchange.sol`:
```solidity
        challengeReward.token.transfer(address(this), challengeReward.reward);

```

It doesn't transfer the tokens to `msg.sender`(solver of puzzle). So, there is no incentive for solver.

**[H-4]** All the ERC20 calls doesn't guarantee to succeed and can add malicious behavior in contract.

In `SudokuExchange.sol`, following ERC20 calls are made:

```solidity
    challengeReward.token.transferFrom(
            msg.sender,
            address(this),
            challengeReward.reward
        );

        challengeReward.token.transfer(address(this), challengeReward.reward);

```

The `token` is added by creator of puzzle and doesn't guarantee to have valid behaviour. Moreover, the above calls may gets failed since return values are not checked and safeErc20 is not used. 

**[H-5]** Frontrunning attack possible on `claimReward` which can result in griefing to solver

```solidity
    require(
            address(rewardChallenges[address(challenge)].token) != address(0x0),
            "Sudoku challenge does not exist at this address"
        );
```

when malicious account sees the puzzle solution transaction in mempool, they can update the reward of that challenge to zero and can lead to griefing for solver.

**[H-6]** Anyone can overwrite the reward for same sudoku challenge with different ERC20 and different rewards

```solidity
        rewardChallenges[address(challengeReward.challenge)] = challengeReward;
```

The above line overwrites the rewards and token set by last user. So, malicious user can just update this by sending the reward to 0 and thus funds sent by previous creator gets lost.


## Gas Optimizations

**[G-1]** struct `ChallengeReward` can be optimized

```solidity
 struct ChallengeReward {
        SudokuChallenge challenge; //can be removed
        uint256 reward;
        ERC20 token;
        bool solved;
    }
```
There is no need to store address of challenge in struct as it is used in mapping.

**[G-2]** calldata can be used instead of memory for arguments of  `createReward`

```solidity
function createReward(ChallengeReward memory challengeReward) public
```

The argument `challengeReward` is not modified in function. can be set as calldata.

**[G-3]** `claimReward` can be optimized

```solidity
bool isCorrect = challenge.validate(solution);

        require(isCorrect, "the solution is not correct");

        // they solved the Sudoku challenge! pay them and then mark the challenge as solved
        ChallengeReward memory challengeReward = rewardChallenges[address(challenge)];
        challengeReward.token.transfer(address(this), challengeReward.reward);
        challengeReward.solved = true;
```

The above code can be wrapped in if(isCorrect) so that require doesn't need to be executed each time.



Try running some of the following commands:

```shell
npx hardhat help
npx hardhat compile              # compile your contracts
npx hardhat test                 # run your tests
npm run test                     # watch for test file changes and automatically run tests
npx hardhat coverage             # generate a test coverage report at coverage/index.html
REPORT_GAS=true npx hardhat test # run your tests and output gas usage metrics
npx hardhat node                 # spin up a fresh in-memory instance of the Ethereum blockchain
npx prettier '**/*.{json,sol,md}' --write # format your Solidity and TS files
```
