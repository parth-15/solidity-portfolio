//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.12;

import "hardhat/console.sol";
import "./SudokuChallenge.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/** Rewards users for solving Sudoku challenges
 *
 * SudokuExchange provides a decentralized exchange connecting amateur Sudoku enthusiasts
 * with experienced Sudoku solvers. Those looking for solutions to their Sudoku challenges
 * call SudokuExchange.createReward, specifying the particular challenge they want solved
 * and the ERC20 reward token and amount the first solver will receive upon successfully
 * solving the challenge
 */
contract SudokuExchange {
    /** All the data necessary for solving a Sudoku challenge and claiming the reward */
    struct ChallengeReward {
        //@audit gas address. no need to use this
        SudokuChallenge challenge;
        uint256 reward;
        //@audit gas address
        ERC20 token;
        bool solved;
    }

    // stores the Sudoku challenges and the data necessary to claim the reward
    // for a successful solution
    // key: SudokuChallenge
    // value: ChallengeReward
    mapping(address => ChallengeReward) rewardChallenges;

    constructor() public {}

    //@audit gas use calldata
    function createReward(ChallengeReward memory challengeReward) public {
        // first transfer in the user's token approved in a previous transaction
        //@audit-ok doesn't guarantee to transfer tokens. can it call approval on other tokens or some maliciuos behavior
        //@audit-ok call can fail
        challengeReward.token.transferFrom(
            msg.sender,
            address(this),
            challengeReward.reward
        );

        // now store the reward so future callers of SudokuExchange.claimReward can solve the challenge
        // and claim the reward
        //@audit-ok can be overwritten
        rewardChallenges[address(challengeReward.challenge)] = challengeReward;
    }

    // claim a previously created reward by solving the Sudoku challenge
    function claimReward(SudokuChallenge challenge, uint8[81] calldata solution)
        public
    {
        // does this challenge even have a reward for it?
        //@audit-ok someone can grief by frontrunning tx and putting reward as 0
        require(
            address(rewardChallenges[address(challenge)].token) != address(0x0),
            "Sudoku challenge does not exist at this address"
        );

        //@audit-ok can always return false but depends on code reviewing ability of solver
        //@audit gas use it in if loop
        // now try to solve it
        bool isCorrect = challenge.validate(solution);

        require(isCorrect, "the solution is not correct");

        // they solved the Sudoku challenge! pay them and then mark the challenge as solved
        ChallengeReward memory challengeReward = rewardChallenges[
            address(challenge)
        ];
        //@audit-ok doesn't guarantee to transfer tokens. can it call approval on other tokens or some maliciuos behavior
        //@audit-ok reentrancy
        //@audit-ok transfers to current address and not recipient
        //@audit-ok call can fail
        challengeReward.token.transfer(address(this), challengeReward.reward);
        //@audit-ok only solved in memory. reward can be claimed any times
        challengeReward.solved = true;
    }
}
