//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./SpaceCoin.sol";

contract ICO {
    uint256 public constant ICO_GOAL = 30_000 ether;
    uint256 public constant SEED_PHASE_TOTAL_CONTRIBUTION_LIMIT = 15_000 ether;
    uint256 public constant SEED_PHASE_INDIVIDUAL_CONTRIBUTION_LIMIT =
        1500 ether;
    uint256 public constant GENERAL_PHASE_TOTAL_CONTRIBUTION_LIMIT =
        30_000 ether;
    uint256 public constant GENERAL_PHASE_INDIVIDUAL_CONTRIBUTION_LIMIT =
        1000 ether;
    uint256 public constant OPEN_PHASE_TOTAL_CONTRIBUTION_LIMIT = 30_000 ether;
    address public immutable OWNER;
    address public immutable SPC_TOKEN_ADDRESS;
    uint256 public currentTotalContribution;
    bool public isFundraisingAndSpcRedemptionPaused = false;
    Phase public currentPhase = Phase.SEED;
    mapping(address => bool) public isPrivateContributor;
    mapping(address => uint256) public tokenReedemed;
    mapping(address => uint256) public contributions;

    event FundraisingAndSpcRedemptionPaused();

    event FundRaisingAndSpcRedemptionResumed();

    event PhaseChanged(uint8 newPhase);

    event PrivateContributorsAdded(address[] contributors);

    event TokenRedeemed(address indexed to, uint256 amount);

    event Contributed(
        uint8 indexed currentPhase,
        address indexed contributor,
        uint256 value
    );

    modifier onlyOwner() {
        require(msg.sender == OWNER, "only owner allowed");
        _;
    }

    modifier isFundRaisingAndSpcRedemptionActive() {
        require(
            !isFundraisingAndSpcRedemptionPaused,
            "fund raising and spc redemption is paused"
        );
        _;
    }

    enum Phase {
        SEED,
        GENERAL,
        OPEN
    }

    constructor(address treasury) {
        OWNER = msg.sender;
        SpaceCoin spaceCoin = new SpaceCoin(OWNER, treasury, address(this));
        SPC_TOKEN_ADDRESS = address(spaceCoin);
    }

    function pauseFundraisingAndSpcRedemption()
        external
        onlyOwner
        isFundRaisingAndSpcRedemptionActive
    {
        isFundraisingAndSpcRedemptionPaused = true;
        emit FundraisingAndSpcRedemptionPaused();
    }

    function resumeFundraisingAndSpcRedemption() external onlyOwner {
        require(
            isFundraisingAndSpcRedemptionPaused,
            "fund raising and spc redemption is active"
        );
        isFundraisingAndSpcRedemptionPaused = false;
        emit FundRaisingAndSpcRedemptionResumed();
    }

    function advancePhase(uint8 newPhase) external onlyOwner {
        require(currentPhase != Phase.OPEN, "can't advance phase after open");
        require(newPhase <= uint8(Phase.OPEN), "invalid phase");
        require(
            uint8(currentPhase) != newPhase,
            "current phase is same as desired phase"
        );
        if (currentPhase == Phase.SEED) {
            require(
                newPhase == uint8(Phase.GENERAL),
                "can only move from SEED to GENERAL"
            );
            currentPhase = Phase.GENERAL;
        } else if (currentPhase == Phase.GENERAL) {
            require(
                newPhase == uint8(Phase.OPEN),
                "can only move from GENERAL to OPEN"
            );
            currentPhase = Phase.OPEN;
        }
        emit PhaseChanged(uint8(currentPhase));
    }

    function addPrivateContributors(address[] calldata contributors)
        external
        onlyOwner
    {
        for (uint256 i = 0; i < contributors.length; i++) {
            isPrivateContributor[contributors[i]] = true;
        }
        emit PrivateContributorsAdded(contributors);
    }

    function contribute() external payable isFundRaisingAndSpcRedemptionActive {
        require(msg.value > 0, "no amount contributed");

        if (currentPhase == Phase.SEED) {
            require(isPrivateContributor[msg.sender], "not a private investor");
            require(
                currentTotalContribution + msg.value <=
                    SEED_PHASE_TOTAL_CONTRIBUTION_LIMIT,
                "seed phase - total contribution limit exceeded"
            );
            require(
                contributions[msg.sender] + msg.value <=
                    SEED_PHASE_INDIVIDUAL_CONTRIBUTION_LIMIT,
                "seed phase - individual contribution limit exceeded"
            );
            currentTotalContribution += msg.value;
            contributions[msg.sender] += msg.value;
            emit Contributed(uint8(Phase.SEED), msg.sender, msg.value);
        } else if (currentPhase == Phase.GENERAL) {
            require(
                currentTotalContribution + msg.value <=
                    GENERAL_PHASE_TOTAL_CONTRIBUTION_LIMIT,
                "general phase - total contribution limit exceeded"
            );
            require(
                contributions[msg.sender] + msg.value <=
                    GENERAL_PHASE_INDIVIDUAL_CONTRIBUTION_LIMIT,
                "general phase - individual contribution limit exceeded"
            );

            currentTotalContribution += msg.value;
            contributions[msg.sender] += msg.value;
            emit Contributed(uint8(Phase.GENERAL), msg.sender, msg.value);
        } else if (currentPhase == Phase.OPEN) {
            require(
                currentTotalContribution + msg.value <=
                    OPEN_PHASE_TOTAL_CONTRIBUTION_LIMIT,
                "open phase - total contribution limit exceeded"
            );

            currentTotalContribution += msg.value;
            contributions[msg.sender] += msg.value;
            emit Contributed(uint8(Phase.OPEN), msg.sender, msg.value);
        }
    }

    function redeemToken() external isFundRaisingAndSpcRedemptionActive {
        require(
            currentPhase == Phase.OPEN,
            "can redeem only during open phase"
        );
        require(contributions[msg.sender] > 0, "no contributions made");
        uint256 amountToTransfer = (contributions[msg.sender] * 5) -
            tokenReedemed[msg.sender];
        if (amountToTransfer > 0) {
            tokenReedemed[msg.sender] += amountToTransfer;
            SpaceCoin spaceCoin = SpaceCoin(SPC_TOKEN_ADDRESS);
            spaceCoin.transfer(msg.sender, amountToTransfer);
            emit TokenRedeemed(msg.sender, amountToTransfer);
        }
    }
}
