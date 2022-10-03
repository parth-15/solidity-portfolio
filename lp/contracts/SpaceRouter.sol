//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./SpaceLP.sol";
import "./SpaceCoin.sol";

contract SpaceRouter {
    SpaceLP public immutable spaceLP;
    SpaceCoin public immutable spaceCoin;

    constructor(SpaceLP _spaceLP, SpaceCoin _spaceCoin) {
        spaceLP = _spaceLP;
        spaceCoin = _spaceCoin;
    }

    /// @notice Provides ETH-SPC liquidity to LP contract
    /// @param spc The amount of SPC to be deposited
    function addLiquidity(uint256 spc) external payable returns (uint256) {
        uint256 spcDepositedInPool = spc -
            (
                spaceCoin.isTransferTaxEnabled()
                    ? (spc * spaceCoin.TRANSFER_TAX_PERCENT()) / 100
                    : 0
            );

        //will get the liquidity of unsync spc reserve
        uint256 spcConsideredAsTransferred = spaceCoin.balanceOf(
            address(spaceLP)
        ) -
            spaceLP.spcTokenBalance() +
            spcDepositedInPool;
        uint256 ethToTransfer = spaceLP.spcTokenBalance() == 0
            ? msg.value
            : ((spaceLP.ethBalance() * spcConsideredAsTransferred) /
                spaceLP.spcTokenBalance()) -
                (address(spaceLP).balance - spaceLP.ethBalance());

        uint256 ethConsideredAsTransferred = address(spaceLP).balance -
            spaceLP.ethBalance() +
            msg.value;
        uint256 spcToTransfer = spaceLP.spcTokenBalance() == 0
            ? spc
            : ((spaceLP.spcTokenBalance() * ethConsideredAsTransferred) /
                spaceLP.ethBalance()) -
                (spaceCoin.balanceOf(address(spaceLP)) -
                    spaceLP.spcTokenBalance());

        if (msg.value >= ethToTransfer) {
            spaceCoin.transferFrom(msg.sender, address(spaceLP), spc);

            uint256 liquidity = spaceLP.deposit{value: ethToTransfer}(
                msg.sender
            );

            (bool success, ) = msg.sender.call{
                value: msg.value - ethToTransfer
            }("");
            require(success, "external call failed");
            return liquidity;
        } else {
            require(spc >= spcToTransfer, "not enough spc sent");

            spaceCoin.transferFrom(msg.sender, address(spaceLP), spcToTransfer);
            uint256 liquidity = spaceLP.deposit{value: msg.value}(msg.sender);
            return liquidity;
        }
    }

    /// @notice Removes ETH-SPC liquidity from LP contract
    /// @param lpToken The amount of LP tokens being returned
    function removeLiquidity(uint256 lpToken)
        external
        returns (uint256, uint256)
    {
        require(
            lpToken <= spaceLP.balanceOf(msg.sender),
            "not enough lp tokens"
        );
        spaceLP.transferFrom(msg.sender, address(spaceLP), lpToken);
        (uint256 spcOut, uint256 ethOut) = spaceLP.withdraw(msg.sender);
        return (spcOut, ethOut);
    }

    /// @notice Swaps ETH for SPC in LP contract
    /// @param spcOutMin The minimum acceptable amout of SPC to be received
    function swapETHForSPC(uint256 spcOutMin)
        external
        payable
        returns (uint256)
    {
        uint256 expectedSpcToBeSent = spaceLP.quoteSwapPrice(msg.value, 0);

        uint256 spcToBeReceivedPostTax = expectedSpcToBeSent -
            (
                spaceCoin.isTransferTaxEnabled()
                    ? (expectedSpcToBeSent * spaceCoin.TRANSFER_TAX_PERCENT()) /
                        100
                    : 0
            );

        require(
            spcToBeReceivedPostTax >= spcOutMin,
            "invalid amount to be received"
        );

        spaceLP.swap{value: msg.value}(msg.sender);

        return spcToBeReceivedPostTax;
    }

    /// @notice Swaps SPC for ETH in LP contract
    /// @param spcIn The amount of inbound SPC to be swapped
    /// @param ethOutMin The minimum acceptable amount of ETH to be received
    function swapSPCForETH(uint256 spcIn, uint256 ethOutMin)
        external
        returns (uint256)
    {
        uint256 spcInPostTax = spcIn -
            (
                spaceCoin.isTransferTaxEnabled()
                    ? (spcIn * spaceCoin.TRANSFER_TAX_PERCENT()) / 100
                    : 0
            );
        uint256 expectedEthToBeSent = spaceLP.quoteSwapPrice(0, spcInPostTax);
        require(
            expectedEthToBeSent >= ethOutMin,
            "invalid amount to be received"
        );

        spaceCoin.transferFrom(msg.sender, address(spaceLP), spcIn);
        spaceLP.swap(msg.sender);
        return expectedEthToBeSent;
    }
}
