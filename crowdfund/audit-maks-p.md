## **[Q-1]** Set MINIMUM_CONTRIBUTION as const

On line 51 and line 59 of Project.sol:

require(amountToRaise\_ >= 0.01 ether, "Invalid amount");
require(msg.value >= 0.01 ether, "Min contribution is 0.01 ether");

Consider: setting a constant state variable called MINIMUM_CONTRIBUTION, since this amount cannot change and is used twice in the contract

## **[Q-2]** Pass a "to" address paramater to the `claimProjectFund` function

Starting on line 103 of Project.sol:

    function claimProjectFund(uint256 amount) external onlyCreator {
        require(status == Status.Completed, "Project not completed");
        require(contractBalance >= amount, "Invalid amount");
        contractBalance -= amount;

        emit CreatorWithdrawal(amount);

        (bool success, ) = payable(CREATOR).call{value: amount}("");
        require(success, "Call failed");
    }

Consider: adding a `to` parameter (of type `address`) to the function signature, so the creator can withdraw their funds to a different address, calling `payable(to)` instead.

## Nitpick

- Consider renaming `claimContributions` to `refund`
- Consider renaming `claimProjectFund` to `withdraw`
- Consider using `indexed` in the `amountToRaise` event in ProjectFactory.sol
