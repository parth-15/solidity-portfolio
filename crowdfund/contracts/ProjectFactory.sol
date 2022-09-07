//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

import "./Project.sol";

contract ProjectFactory {
    event ProjectCreated(address indexed creator, address indexed project, uint256 amountToRaise);

    function create(uint256 amountToRaise, string calldata name, string calldata symbol) external {
        
        Project project = new Project(msg.sender, amountToRaise, name, symbol);
        emit ProjectCreated(msg.sender, address(project), amountToRaise);
    }
}
