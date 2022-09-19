// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./INftMarketplace.sol";

//Take care of hash collision in proposal data
// member should not be able to vote twice or proposal before start time or after endtime
// replay protection in signatures
// check what if proposal doesn't exist

contract DAO {
    uint256 public constant MEMBERSHIP_FEE = 1 ether;
    uint256 public constant VOTING_PERIOD = 7 days;
    mapping(address => bool) public isMember;
    uint256 public currentMembers;
    uint256 public proposalCountId;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) membershipCreationTime;
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    mapping(address => uint256) public votingPower;

    //TODO @audit-info pack this struct. also should add ID to this
    struct Proposal {
        uint256 counter;
        uint256 startTime;
        uint256 endTime;
        address creator;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 totalMembersAtTimeOfCreation;
        bool executed;
    }

    constructor() {
        currentMembers = 0;
        proposalCountId = 1;
    }

    /*
        Shouldn't able to vote non existent proposal
    */
    function vote(uint256 proposalId, bool support) external {
        require(isMember[msg.sender], "not a member");

        Proposal storage proposal = proposals[proposalId];

        require(
            proposal.counter >= 1 && proposal.counter < proposalCountId,
            "invalid proposal id"
        );
        require(
            membershipCreationTime[msg.sender] <= proposal.startTime,
            "not a member at proposal creation"
        );
        require(!hasVoted[msg.sender][proposalId], "already voted");
        require(
            block.timestamp >= proposal.startTime &&
                block.timestamp <= proposal.endTime,
            "proposal not active"
        );
        require(!proposal.executed, "can't vote after execution");

        if (support) {
            proposal.yesVotes += votingPower[msg.sender];
        } else {
            proposal.noVotes += votingPower[msg.sender];
        }
    }

    function propose(
        address[] memory targets,
        address[] memory values,
        address[] memory calldatas
    ) external returns (uint256) {
        require(isMember[msg.sender], "not a member");
        require(targets.length == values.length, "invalid arguments");
        require(values.length == calldatas.length, "invalid arguments");
        require(targets.length > 0, "nothing proposed");

        uint256 proposalId = hashProposal(
            targets,
            values,
            calldatas,
            proposalCountId
        );
        Proposal storage proposal = proposals[proposalId];
        proposal.counter = proposalCountId++;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + VOTING_PERIOD;
        proposal.creator = msg.sender;
        proposal.yesVotes = 0;
        proposal.noVotes = 0;
        proposal.totalMembersAtTimeOfCreation = currentMembers;
        proposal.executed = false;

        return proposalId;
    }

    //@audit-info is it needed to pass proposalId here
    // Should we check sizes here
    //use check effect interaction pattern here
    //TODO send reward to executor
    function executeProposal(
        uint256 proposalId,
        uint256 proposalCounter,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) external {
        uint256 calculatedProposalId = hashProposal(
            targets,
            values,
            calldatas,
            proposalCounter
        );
        require(
            proposalId == calculatedProposalId,
            "proposal id doesn't match"
        );

        Proposal storage proposal = proposals[proposalId];

        require(!proposal.executed, "proposal executed");
        require(proposal.counter == proposalCounter, "invalid counter");
        require(
            proposal.counter >= 1 && proposal.counter < proposalCountId,
            "invalid proposal id"
        );
        require(isProposalPassed(proposalId), "proposal not passed");
        proposal.executed = true;

        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory data) = targets[i].call{
                value: values[i]
            }(calldatas[i]);
            require(success, "call failed");
        }

        votingPower[proposal.creator]++;
    }

    function isProposalPassed(uint256 proposalId) private view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        uint256 memberVoted = proposal.yesVotes + proposal.noVotes;
        uint256 totalMembersAtTimeOfCreation = proposal
            .totalMembersAtTimeOfCreation;
        uint256 requiredVotedMembers = (totalMembersAtTimeOfCreation * 25) /
            100;
        return
            proposal.counter >= 1 &&
            proposal.counter < proposalCountId &&
            block.timestamp > proposal.endTime &&
            proposal.yesVotes > proposal.noVotes &&
            memberVoted >= requiredVotedMembers;
    }

    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        uint256 proposalCounter
    ) private pure returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encode(targets, values, calldatas, proposalCounter)
                )
            );
    }

    function buyMembership() external payable {
        require(msg.value == MEMBERSHIP_FEE, "invalid fee");
        require(!isMember[msg.sender], "already a member");
        isMember[msg.sender] = true;
        membershipCreationTime[msg.sender] = block.timestamp;
        votingPower[msg.sender] = 1;
        currentMembers++;
    }

    function buyNFTFromMarketplace(
        INftMarketplace marketplace,
        address nftContract,
        uint256 nftId,
        uint256 maxPrice
    ) private {}
}
