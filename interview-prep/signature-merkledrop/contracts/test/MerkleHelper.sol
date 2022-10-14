pragma solidity ^0.8.9;

contract MerkleHelper {
    function toLeafFormat(address _recipient, uint256 _amount)
        external
        pure
        returns (bytes32)
    {
        return keccak256(bytes(abi.encode(_recipient, _amount)));
    }

    function concat(bytes32 hash1, bytes32 hash2)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(hash1, hash2));
    }

    function chainId() external view returns (uint256) {
        return block.chainid;
    }
}
