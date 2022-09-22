// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "../DAO.sol";
import "hardhat/console.sol";

contract DAOHelper {
    string public constant name = "Macro Dao Governance";
    uint256 public constant MEMBERSHIP_FEE = 1 ether;
    uint256 public constant EXECUTION_REWARDS = 0.01 ether;
    uint256 public constant VOTING_PERIOD = 7 days;
    mapping(address => bool) public isMember;
    uint256 public currentMembers;
    uint256 public proposalCounterId;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public membershipCreationTime;
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    mapping(address => uint256) public votingPower;
    DAO public dao;

    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
        );

    bytes32 public constant BALLOT_TYPEHASH =
        keccak256("Ballot(uint256 proposalId,bool support)");

    //TODO @audit-info pack this struct. also should add ID to this
    struct Proposal {
        uint256 nonce;
        uint256 startTime;
        uint256 endTime;
        address creator;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 totalMembersAtTimeOfCreation;
        bool executed;
    }

    constructor(address _dao) {
        currentMembers = 0;
        proposalCounterId = 1;
        dao = DAO(_dao);
    }

    function getCalldataForNFTMarketplace(
        address marketplace,
        address nftContract,
        uint256 nftId,
        uint256 maxPrice
    ) public returns (bytes memory) {
        bytes memory transferPayload = abi.encodeWithSelector(
            DAO.buyNFTFromMarketplace.selector,
            marketplace,
            nftContract,
            nftId,
            maxPrice
        );
        // console.log();
        // bytes memory transferPayload = abi.encodeWithSignature(
        //     "buyNFTFromMarketplace(address,address,uint256,uint256)",
        //     marketplace,
        //     nftContract,
        //     nftId,
        //     maxPrice
        // );
        return transferPayload;
    }

    function executeProposal(
        uint256 proposalId,
        uint256 nonceBefore,
        address[] memory randomAddresses,
        uint256[] memory randomValues,
        bytes[] memory randomCalldatas
    ) external {
        dao.executeProposal(
            proposalId,
            nonceBefore,
            randomAddresses,
            randomValues,
            randomCalldatas
        );
    }

    //@audit-info it is rounding down in quorum
    function isProposalPassed(uint256 proposalId) external view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        uint256 memberVoted = proposal.yesVotes + proposal.noVotes;
        uint256 totalMembersAtTimeOfCreation = proposal
            .totalMembersAtTimeOfCreation;
        uint256 requiredVotedMembers = (totalMembersAtTimeOfCreation * 25) /
            100;
        return
            proposal.nonce >= 1 &&
            proposal.nonce < proposalCounterId &&
            block.timestamp > proposal.endTime &&
            proposal.yesVotes > proposal.noVotes &&
            memberVoted >= requiredVotedMembers;
    }

    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        uint256 nonce
    ) external pure returns (uint256) {
        return
            uint256(keccak256(abi.encode(targets, values, calldatas, nonce)));
    }

    function getChainIdInternal() external view returns (uint) {
        uint chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }

    //Critical to make it private or add modifier
    //TODO: check price and send ether accordinglys
    //TODO: check how can we utilize maxPrice properly
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external returns (bytes4) {
        return
            bytes4(
                keccak256("onERC721Received(address,address,uint256,bytes)")
            );
    }
}
