// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "../DAO.sol";

contract DAOHelper {
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
        );

    bytes32 public constant BALLOT_TYPEHASH =
        keccak256("Ballot(uint256 proposalId,bool support)");

    constructor(address _dao) {
        // currentMembers = 0;
        // proposalCounterId = 1;
        // dao = DAO(_dao);
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
}
