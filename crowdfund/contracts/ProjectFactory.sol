//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

contract ProjectFactory {
    event ProjectCreated(address newProject); // Note: you should add additional data fields in this event

    function create() external {
        // TODO: implement me!

        emit ProjectCreated(address(0x0)); // TODO: replace me with the actual Project's address
    }
}
