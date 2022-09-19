// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./INftMarketplace.sol";

contract MockNftMarketplace is INftMarketplace {
    /// @notice The NFT contract we'll use for testing. This NFTs token will be transfered
    /// after a successful call to MockNftMarketplace.buy
    ERC721 public someNFT;

    constructor() {
        someNFT = new ERC721("Some NFT", "NFT");

        // TODO: perform any setup of storage variables you want here.
        // You'll likely want to mint some NFTs so you can transfer them
        // when an address calls MockNftMarketplace.buy
    }

    /// @inheritdoc INftMarketplace
    function getPrice(address nftContract, uint256 nftId)
        public
        view
        override
        returns (uint256 price)
    {
        // TODO: return some reasonable price value here
    }

    /// @inheritdoc INftMarketplace
    function buy(address nftContract, uint256 nftId)
        external
        payable
        override
        returns (bool success)
    {
        // MockNftMarketplace only has a single NFT for addresses to buy
        // so let's ensure the caller is specifying the only correct NFT
        // contract
        if (nftContract != address(someNFT)) {
            revert IncorrectNftContract(nftContract);
        }

        if (getPrice(nftContract, nftId) > msg.value) {
            revert InsufficientFunds(msg.value, getPrice(nftContract, nftId));
        }

        someNFT.safeTransferFrom(address(this), msg.sender, nftId);

        // Our MockNftMarketplace's return value isn't useful, since
        // there is no way for MockNftMarketplace.buy to return `false`. However,
        // we still need to adhere to the interface, so we return true anyway.
        return true;
    }

    error IncorrectNftContract(address nftContract);
    error InsufficientFunds(uint256 insufficientAmount, uint256 requiredAmount);
}
