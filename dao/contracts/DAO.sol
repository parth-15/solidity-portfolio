// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./INftMarketplace.sol";

contract DAO {
    string public constant name = "Macro Dao Governance";
    uint256 public constant MEMBERSHIP_FEE = 1 ether;
    uint256 public constant EXECUTION_REWARDS = 0.01 ether;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public currentMembers;
    uint256 public proposalCounterId;
    mapping(address => bool) public isMember;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public membershipCreationTime;
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    mapping(address => uint256) public votingPower;

    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
        );

    bytes32 public constant BALLOT_TYPEHASH =
        keccak256("Ballot(uint256 proposalId,bool support)");

    event VoteCasted(
        address indexed caster,
        uint256 indexed proposalId,
        bool support
    );
    event ProposalCreated(uint256 proposalId, uint256 nonce);
    event ProposalExecuted(uint256 proposalId);
    event MemberCreated(address member);
    event NftPurchased(address indexed nftContract, uint256 nftId);

    struct Proposal {
        uint256 nonce;
        uint256 startTime;
        uint256 endTime;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 totalMembersAtTimeOfCreation;
        address creator;
        bool executed;
    }

    constructor() {
        proposalCounterId = 1;
    }

    function castBulkVoteBySignature(
        uint256[] memory proposalId,
        bool[] memory support,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) external {
        uint256 length = proposalId.length;
        if (length == 0) {
            revert InvalidArguments("empty list");
        }
        if (support.length != length) {
            revert InvalidArguments("support list invalid");
        }
        if (v.length != length) {
            revert InvalidArguments("v list invalid");
        }
        if (r.length != length) {
            revert InvalidArguments("r list invalid");
        }
        if (s.length != length) {
            revert InvalidArguments("s list invalid");
        }

        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                getChainId(),
                address(this)
            )
        );

        for (uint256 i = 0; i < length; i++) {
            bytes32 structHash = keccak256(
                abi.encode(BALLOT_TYPEHASH, proposalId[i], support[i])
            );
            bytes32 digest = keccak256(
                abi.encodePacked("\x19\x01", domainSeparator, structHash)
            );
            address signer = ecrecover(digest, v[i], r[i], s[i]);

            if (signer == address(0) || !isMember[signer]) {
                revert SignatureVerificationBatchFailed(i, proposalId[i]);
            }

            Proposal storage proposal = proposals[proposalId[i]];

            if (
                proposal.nonce == 0 ||
                membershipCreationTime[signer] > proposal.startTime ||
                hasVoted[signer][proposalId[i]] ||
                block.timestamp < proposal.startTime ||
                block.timestamp > proposal.endTime ||
                proposal.executed
            ) {
                revert SignatureVerificationBatchFailed(i, proposalId[i]);
            }

            hasVoted[signer][proposalId[i]] = true;

            if (support[i]) {
                proposal.yesVotes += votingPower[signer];
            } else {
                proposal.noVotes += votingPower[signer];
            }

            emit VoteCasted(signer, proposalId[i], support[i]);
        }
    }

    function castVoteBySignature(
        uint256 proposalId,
        bool support,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name)),
                getChainId(),
                address(this)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(BALLOT_TYPEHASH, proposalId, support)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) {
            revert SignatureVerificationFailed();
        }
        if (!isMember[signer]) {
            revert NotMember();
        }

        Proposal storage proposal = proposals[proposalId];

        if (proposal.nonce == 0) {
            revert InvalidProposalId();
        }
        if (membershipCreationTime[signer] > proposal.startTime) {
            revert NotMemberAtProposalCreation();
        }
        if (hasVoted[signer][proposalId]) {
            revert AlreadyVoted();
        }
        if (
            block.timestamp < proposal.startTime ||
            block.timestamp > proposal.endTime
        ) {
            revert ProposalNotActive();
        }
        if (proposal.executed) {
            revert ProposalAlreadyExecuted();
        }
        hasVoted[signer][proposalId] = true;

        if (support) {
            proposal.yesVotes += votingPower[signer];
        } else {
            proposal.noVotes += votingPower[signer];
        }

        emit VoteCasted(signer, proposalId, support);
    }

    function vote(uint256 proposalId, bool support) external {
        if (!isMember[msg.sender]) {
            revert NotMember();
        }

        Proposal storage proposal = proposals[proposalId];

        if (proposal.nonce == 0) {
            revert InvalidProposalId();
        }

        if (membershipCreationTime[msg.sender] > proposal.startTime) {
            revert NotMemberAtProposalCreation();
        }

        if (hasVoted[msg.sender][proposalId]) {
            revert AlreadyVoted();
        }

        if (
            block.timestamp < proposal.startTime ||
            block.timestamp > proposal.endTime
        ) {
            revert ProposalNotActive();
        }

        if (proposal.executed) {
            revert ProposalAlreadyExecuted();
        }

        hasVoted[msg.sender][proposalId] = true;

        if (support) {
            proposal.yesVotes += votingPower[msg.sender];
        } else {
            proposal.noVotes += votingPower[msg.sender];
        }

        emit VoteCasted(msg.sender, proposalId, support);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) external returns (uint256, uint256) {
        if (!isMember[msg.sender]) {
            revert NotMember();
        }
        if (targets.length != values.length) {
            revert InvalidArguments("array length mismatch");
        }
        if (values.length != calldatas.length) {
            revert InvalidArguments("array length mismatch");
        }
        if (targets.length != calldatas.length) {
            revert InvalidArguments("array length mismatch");
        }
        if (targets.length == 0) {
            revert InvalidArguments("zero length");
        }

        uint256 proposalId = hashProposal(
            targets,
            values,
            calldatas,
            proposalCounterId
        );
        Proposal storage proposal = proposals[proposalId];
        proposal.nonce = proposalCounterId++;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + VOTING_PERIOD;
        proposal.creator = msg.sender;
        proposal.yesVotes = 0;
        proposal.noVotes = 0;
        proposal.totalMembersAtTimeOfCreation = currentMembers;
        proposal.executed = false;

        emit ProposalCreated(proposalId, proposal.nonce);

        return (proposalId, proposal.nonce);
    }

    function executeProposal(
        uint256 proposalId,
        uint256 originalNonce,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) external {
        uint256 calculatedProposalId = hashProposal(
            targets,
            values,
            calldatas,
            originalNonce
        );
        if (proposalId != calculatedProposalId) {
            revert InvalidProposalId();
        }

        Proposal storage proposal = proposals[proposalId];

        if (proposal.executed) {
            revert ProposalAlreadyExecuted();
        }

        if (proposal.nonce != originalNonce) {
            revert InvalidArguments("Nonce doesn't match");
        }

        if (proposal.nonce == 0) {
            revert InvalidProposalId();
        }

        if (!isProposalPassed(proposalId)) {
            revert ProposalNotPassed();
        }

        proposal.executed = true;
        votingPower[proposal.creator]++;

        emit ProposalExecuted(proposalId);

        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, ) = targets[i].call{value: values[i]}(calldatas[i]);
            if (!success) {
                revert ExternalCallFailed();
            }
        }

        if (address(this).balance >= 5 ether) {
            (bool success, ) = msg.sender.call{value: EXECUTION_REWARDS}("");
            if (!success) {
                revert ExternalCallFailed();
            }
        }
    }

    function hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        uint256 nonce
    ) private pure returns (uint256) {
        return
            uint256(keccak256(abi.encode(targets, values, calldatas, nonce)));
    }

    function buyMembership() external payable {
        if (msg.value != MEMBERSHIP_FEE) {
            revert InvalidFee();
        }
        if (isMember[msg.sender]) {
            revert AlreadyMember();
        }
        isMember[msg.sender] = true;
        membershipCreationTime[msg.sender] = block.timestamp;
        votingPower[msg.sender] = 1;
        currentMembers++;

        emit MemberCreated(msg.sender);
    }

    function buyNFTFromMarketplace(
        INftMarketplace marketplace,
        address nftContract,
        uint256 nftId,
        uint256 maxPrice
    ) external {
        if (msg.sender != address(this)) {
            revert InvalidCaller();
        }

        uint256 nftPrice = marketplace.getPrice(nftContract, nftId);

        if (address(this).balance < nftPrice) {
            revert InsufficientFunds();
        }

        if (nftPrice > maxPrice) {
            revert InvalidArguments("Price of nft too high");
        }

        emit NftPurchased(nftContract, nftId);

        marketplace.buy{value: nftPrice}(nftContract, nftId);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) public pure returns (bytes4) {
        return
            bytes4(
                keccak256("onERC721Received(address,address,uint256,bytes)")
            );
    }

    function getChainId() public view returns (uint256) {
        uint chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }

    function isProposalPassed(uint256 proposalId) private view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        uint256 memberVoted = proposal.yesVotes + proposal.noVotes;
        uint256 totalMembersAtTimeOfCreation = proposal
            .totalMembersAtTimeOfCreation;
        return
            proposal.nonce >= 1 &&
            proposal.nonce < proposalCounterId &&
            block.timestamp > proposal.endTime &&
            proposal.yesVotes > proposal.noVotes &&
            (4 * memberVoted) >= totalMembersAtTimeOfCreation;
    }

    error SignatureVerificationBatchFailed(uint256 index, uint256 proposalId);
    error InvalidArguments(string reason);
    error SignatureVerificationFailed();
    error NotMember();
    error AlreadyMember();
    error InvalidProposalId();
    error NotMemberAtProposalCreation();
    error AlreadyVoted();
    error ProposalNotActive();
    error ProposalAlreadyExecuted();
    error ProposalNotPassed();
    error ExternalCallFailed();
    error InvalidFee();
    error InvalidCaller();
    error InsufficientFunds();
}
