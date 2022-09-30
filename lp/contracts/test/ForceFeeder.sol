//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "../SpaceLP.sol";

contract ForceFeeder {
    SpaceLP immutable spaceLP;

    constructor(address _spaceLP) payable {
        spaceLP = SpaceLP(_spaceLP);
    }

    function forceSendEther() external payable {
        selfdestruct(payable(address(spaceLP)));
    }
}
