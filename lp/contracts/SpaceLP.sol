//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./SpaceCoin.sol";

contract SpaceLP is ERC20 {
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    SpaceCoin public immutable spaceCoin;
    uint256 public spcTokenBalance;
    uint256 public ethBalance;

    constructor(SpaceCoin _spaceCoin) ERC20("LP TOKENS", "LPT") {
        spaceCoin = _spaceCoin;
    }

    /// @notice Adds ETH-SPC liquidity to LP contract
    /// @param to The address that will receive the LP tokens
    //@audit-info critical should use MINIMUM LIQUIDITY or not?
    function deposit(address to) external payable returns (uint256) {
        uint256 spcTransferred = spaceCoin.balanceOf(address(this)) -
            spcTokenBalance;
        uint256 ethTransferred = address(this).balance - ethBalance;
        require(
            spcTransferred > 0 && ethTransferred > 0,
            "not enough amount provided"
        );
        uint256 lpTokensTotalSupply = totalSupply();
        uint256 liquidity = 0;
        if (lpTokensTotalSupply == 0) {
            liquidity = sqrt(spcTransferred * ethTransferred);
            require(liquidity > MINIMUM_LIQUIDITY, "insufficient liquidity");
            _mint(to, liquidity - MINIMUM_LIQUIDITY);
            _mint(address(1), MINIMUM_LIQUIDITY);
        } else {
            liquidity = min(
                (lpTokensTotalSupply * spcTransferred) / spcTokenBalance,
                (lpTokensTotalSupply * ethTransferred) / ethBalance
            );
            require(liquidity > 0, "insufficient liquidity");
            _mint(to, liquidity);
        }

        spcTokenBalance = spaceCoin.balanceOf(address(this));
        ethBalance = address(this).balance;

        return liquidity;
    }

    /// @notice Returns ETH-SPC liquidity to liquidity provider
    /// @param to The address that will receive the outbound token pair
    function withdraw(address to) external returns (uint256, uint256) {
        uint256 lpTokenBalance = balanceOf(address(this));
        uint256 currentSpcBalance = spaceCoin.balanceOf(address(this));
        uint256 currentEthBalance = address(this).balance;
        uint256 lpTotalSupply = totalSupply();

        uint256 spcTokenOut = (currentSpcBalance * lpTokenBalance) /
            lpTotalSupply;
        uint256 ethOut = (currentEthBalance * lpTokenBalance) / lpTotalSupply;

        require(lpTokenBalance > 0, "insufficient liquidity");

        //Effects
        _burn(address(this), lpTokenBalance);

        spcTokenBalance = spaceCoin.balanceOf(address(this)) - spcTokenOut;
        ethBalance = address(this).balance - ethOut;

        //Interactions
        spaceCoin.transfer(to, spcTokenOut);
        (bool success, ) = to.call{value: ethOut}("");
        require(success, "external call failed");

        return (spcTokenOut, ethOut);
    }

    /// @notice Swaps ETH for SPC, or SPC for ETH
    /// @param to The address that will receive the outbound SPC or ETH
    function swap(address to) external payable {
        uint256 spcTransferred = spaceCoin.balanceOf(address(this)) -
            spcTokenBalance;
        uint256 ethTransferred = address(this).balance - ethBalance;
        if (spcTransferred > 0 && ethTransferred > 0) {
            require(
                true,
                "Swap unavailable while both ETH and SPC actual balances are out of sync with their corresponding reserve balances. Consider syncing the reserve balances before continuing."
            );
        }
        if (spcTransferred == 0 && ethTransferred == 0) {
            require(true, "no assets sent");
        }
        if (spcTransferred > 0) {
            uint256 spcToBeAdded = spcTransferred - (spcTransferred) / 100;
            uint256 ethInReserve = (spcTokenBalance * ethBalance) /
                (spcTokenBalance + spcToBeAdded);
            uint256 ethToBeSent = ethBalance - ethInReserve;
            uint256 finalEthBalance = address(this).balance - ethToBeSent;
            uint256 finalSpcBalance = spaceCoin.balanceOf(address(this));
            //Checks
            require(
                finalEthBalance * finalSpcBalance >=
                    spcTokenBalance * ethBalance,
                "invalid swap"
            );
            //Effects
            ethBalance = address(this).balance - ethToBeSent;
            spcTokenBalance = spaceCoin.balanceOf(address(this));
            //Interactions
            (bool success, ) = to.call{value: ethToBeSent}("");
            require(success, "external call failed");
        } else {
            uint256 ethToBeAdded = ethTransferred - (ethTransferred) / 100;
            uint256 spcInReserve = (spcTokenBalance * ethBalance) /
                (ethBalance + ethToBeAdded);
            uint256 spcToBeSent = spcTokenBalance - spcInReserve;
            uint256 finalEthBalance = address(this).balance;
            uint256 finalSpcBalance = spaceCoin.balanceOf(address(this)) -
                spcToBeSent;
            //checks
            require(
                finalEthBalance * finalSpcBalance >=
                    spcTokenBalance * ethBalance,
                "invalid swap"
            );
            //effects
            spcTokenBalance =
                spaceCoin.balanceOf(address(this)) -
                spcTokenBalance;
            ethBalance = address(this).balance;
            //interactions
            spaceCoin.transfer(to, spcToBeSent);
        }
    }

    function skim(address to) external {
        uint256 ethToSend = address(this).balance - ethBalance;
        ethBalance = address(this).balance - ethToSend;
        if (ethToSend > 0) {
            (bool success, ) = to.call{value: ethToSend}("");
            require(success, "external call failed");
        }
        //don't put this above external call, otherwise there can be reentrancy attacks
        uint256 spcToSend = spaceCoin.balanceOf(address(this)) -
            spcTokenBalance;
        spcTokenBalance = spaceCoin.balanceOf(address(this)) - spcToSend;
        if (spcToSend > 0) {
            spaceCoin.transfer(to, spcToSend);
        }
    }

    function quoteSwapPrice(uint256 ethAmount, uint256 spcAmount)
        external
        view
        returns (uint256)
    {
        if (ethAmount > 0 && spcAmount > 0) {
            require(true, "can't send both assets");
        }
        if (ethAmount == 0 && spcAmount == 0) {
            require(true, "no assets sent");
        }
        if (spcAmount > 0) {
            uint256 spcToBeAdded = spcAmount - (spcAmount) / 100;
            uint256 ethInReserve = (spcTokenBalance * ethBalance) /
                (spcTokenBalance + spcToBeAdded);
            uint256 ethToBeSent = ethBalance - ethInReserve;
            uint256 finalSpcBalance = spcTokenBalance + spcToBeAdded;
            uint256 finalEthBalance = ethInReserve;

            require(
                finalSpcBalance * finalEthBalance >=
                    spcTokenBalance * ethBalance,
                "invalid swap"
            );

            return ethToBeSent;
        } else {
            uint256 ethToBeAdded = ethAmount - (ethAmount) / 100;
            uint256 spcInReserve = (spcTokenBalance * ethBalance) /
                (ethBalance + ethToBeAdded);
            uint256 spcToBeSent = spcTokenBalance - spcInReserve;
            uint256 finalSpcBalance = spcInReserve;
            uint256 finalEthBalance = ethBalance - ethToBeAdded;
            require(
                finalSpcBalance * finalEthBalance >=
                    spcTokenBalance * ethBalance,
                "invalid swap"
            );
            return spcToBeSent;
        }
    }

    function min(uint x, uint y) internal pure returns (uint z) {
        z = x < y ? x : y;
    }

    // babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
