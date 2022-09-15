//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SpaceCoin is ERC20 {
    uint256 public constant TRANSFER_TAX_PERCENT = 2;
    uint256 public immutable MAX_TOTAL_SUPPLY;
    uint256 public immutable MINT_TO_ICO_AMOUNT;
    uint256 public immutable MINT_TO_TREASURY_AMOUNT;
    address public immutable OWNER;
    address public immutable TREASURY;
    bool public isTransferTaxEnabled = false;

    event TransferTaxSet(bool isTransferTaxEnabled);

    constructor(
        address owner_,
        address treasury_,
        address ico_
    ) ERC20("SpaceCoin", "SPC") {
        MAX_TOTAL_SUPPLY = 500_000 * 10**decimals();
        MINT_TO_ICO_AMOUNT = 150_000 * 10**decimals();
        MINT_TO_TREASURY_AMOUNT = 350_000 * 10**decimals();
        OWNER = owner_;
        TREASURY = treasury_;
        _mint(ico_, MINT_TO_ICO_AMOUNT);
        _mint(treasury_, MINT_TO_TREASURY_AMOUNT);
    }

    function setTransferTax(bool newValue) external {
        require(msg.sender == OWNER, "only owner allowed");
        require(
            isTransferTaxEnabled != newValue,
            "transfer tax value is same as desired"
        );
        isTransferTaxEnabled = newValue;
        emit TransferTaxSet(isTransferTaxEnabled);
    }

    //@audit-info check this with melville
    function _transfer(
        address from,
        address recipient,
        uint256 amount
    ) internal virtual override {
        uint256 amountToRecipient = amount;
        uint256 amountToTreasury = 0;
        if (isTransferTaxEnabled) {
            amountToRecipient =
                amountToRecipient -
                (amount * TRANSFER_TAX_PERCENT) /
                100;
            amountToTreasury =
                amountToTreasury +
                (amount * TRANSFER_TAX_PERCENT) /
                100;
            super._transfer(from, TREASURY, amountToTreasury);
        }
        super._transfer(from, recipient, amountToRecipient);
    }
}
