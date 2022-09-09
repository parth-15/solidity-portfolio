//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract Project is ERC721 {
    uint256 public constant ROUND_DURATION = 30 days;
    uint256 public immutable AMOUNT_TO_RAISE;
    address public immutable CREATOR;
    uint256 public immutable ROUND_END_TIME;
    Status public status;
    mapping(address => uint256) public badgesGiven;
    mapping(address => uint256) public contributions;
    uint256 public contractBalance;
    uint256 public tokenId;

    event ContributionReceived(address indexed contributor, uint256 amount);

    event CreatorWithdrawal(uint256 amount);

    event ContributorRefund(address indexed contributor, uint256 amount);

    event ProjectCompleted(uint256 timeStamp);

    event ProjectCanceled(uint256 timeStamp);

    modifier onlyCreator() {
        require(msg.sender == CREATOR, "Unauthorized");
        _;
    }

    modifier onlyActive() {
        require(status == Status.Active, "Project not active");
        require(block.timestamp < ROUND_END_TIME, "Round ended");
        _;
    }

    enum Status {
        Active,
        Completed,
        Failed
    }

    constructor(
        address creator_,
        uint256 amountToRaise_,
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {
        require(creator_ != address(0), "Invalid address");
        require(amountToRaise_ >= 0.01 ether, "Invalid amount");
        status = Status.Active;
        CREATOR = creator_;
        AMOUNT_TO_RAISE = amountToRaise_;
        ROUND_END_TIME = block.timestamp + ROUND_DURATION;
    }

    function _setStatusToComplete() internal {
        require(status == Status.Active, "Invalid state transition");
        status = Status.Completed;
        emit ProjectCompleted(block.timestamp);
    }

    function contribute() external payable onlyActive {
        require(msg.value >= 0.01 ether, "Min contribution is 0.01 ether");

        if (contractBalance + msg.value >= AMOUNT_TO_RAISE) {
            _setStatusToComplete();
        }

        contributions[msg.sender] += msg.value;
        contractBalance += msg.value;

        uint256 badgesToGive = (contributions[msg.sender] / (1 ether)) -
            badgesGiven[msg.sender];

        badgesGiven[msg.sender] += badgesToGive;

        emit ContributionReceived(msg.sender, msg.value);

        for (uint256 i = 0; i < badgesToGive; i++) {
            _safeMint(msg.sender, tokenId++);
        }
    }

    function cancelProject() external onlyCreator onlyActive {
        status = Status.Failed;
        emit ProjectCanceled(block.timestamp);
    }

    function claimContributions() external {
        if (status == Status.Active && block.timestamp > ROUND_END_TIME) {
            status = Status.Failed;
        }

        require(contributions[msg.sender] > 0, "No contribution");
        require(status == Status.Failed, "Project active or completed");
        uint256 amount = contributions[msg.sender];
        require(contractBalance < AMOUNT_TO_RAISE, "Goal met");
        contractBalance -= amount;
        contributions[msg.sender] -= amount;

        emit ContributorRefund(msg.sender, amount);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Call failed");
    }

    function claimProjectFund(uint256 amount) external onlyCreator {
        require(status == Status.Completed, "Project not completed");
        require(contractBalance >= amount, "Invalid amount");
        contractBalance -= amount;

        emit CreatorWithdrawal(amount);

        (bool success, ) = payable(CREATOR).call{value: amount}("");
        require(success, "Call failed");
    }
}
