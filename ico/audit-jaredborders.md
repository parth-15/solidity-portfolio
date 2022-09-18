Audit by: [Jared Borders](https://github.com/JaredBorders)

Well done, Parth! I did not find any High, Medium, nor Low vulnerabilities in your project. 👍

# Detailed findings
The following section(s) include in-depth descriptions of the findings of the audit.

## (Q) Code Quality
> No obvious risk, but fixing it improves code quality, better conforms to standards, and ultimately may reduce unperceived risk in the future

* `MAX_TOTAL_SUPPLY`: Never used; recommend removing.
* Consider renaming `setTransferTax()`: "Setting a Tax" seems like tax amount can be changed.
    * Waste of gas checking that `isTransferTaxEnabled != newValue`. Why would it matter if the value was the same? Would it impact logic in any way?
* Tax calculations in `_transfer()` can be optimized
* Inconsistent unit conventions: You use `10**decimals()` in `SafeCoin.sol` but `ether` in `Ico.sol`. Is there a reason for this?
* `bool public isFundraisingAndSpcRedemptionPaused = false;` No need to specify false. Default value is `false`
* can use `unchecked` in for-loops to save gas when iterating `i`
> ex unchecked { i++ } // it will never overflow thus checks for that are not needed
* Checking ` else if (currentPhase == Phase.OPEN) {` uses gas for an extra check that is not needed
* `redeemToken()` seems overcomplicated. `tokenReedemed` is used only here and why not just set `contributions[caller]` to zero? If there is logic here I am missing, please lmk!!
* `SpaceCoin spaceCoin = SpaceCoin(SPC_TOKEN_ADDRESS);` this could be done in the constructor (you are already storing the address there) and not every time someone tries to redeem tokens
* (NIT) Would highly recommend adding comments describing logic