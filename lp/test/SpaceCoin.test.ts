/* eslint-disable no-unused-expressions,camelcase */
// ----------------------------------------------------------------------------
// REQUIRED: Instructions
// ----------------------------------------------------------------------------
/*
  For this second project, we've provided dramatically reduce the amount 
  of provided scaffolding in your test suite. We've done this to:

    1. Take the training wheels off, while still holding you accountable to the 
       level of testing required. (Illustrated in the previous projects test suite.)
    2. Instead, redirect your attention to the next testing lesson; a more advanced
       testing feature we'll use called fixtures! (See comments below, where 
       beforeEach used to be!)

  Please note that:  

    - You will still find several places where "FILL_ME_IN" has been left for
      you. In those places, delete the "FILL_ME_IN" text, and replace it with
      whatever is appropriate.

    - You're free to edit the setupFixture function if you need to due to a 
      difference in your design choices while implementing your contracts.
*/
// ----------------------------------------------------------------------------

import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ICO, SpaceCoin } from "../typechain-types";

// ----------------------------------------------------------------------------
// OPTIONAL: Constants and Helper Functions
// ----------------------------------------------------------------------------
// We've put these here for your convenience, and to make you aware these built-in
// Hardhat functions exist. Feel free to use them if they are helpful!
const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");

// Bump the timestamp by a specific amount of seconds
const timeTravel = async (seconds: number): Promise<number> => {
  return time.increase(seconds);
};

// Or, set the time to be a specific amount (in seconds past epoch time)
const timeTravelTo = async (seconds: number): Promise<void> => {
  return time.increaseTo(seconds);
};

// Compare two BigNumbers that are close to one another.
//
// This is useful for when you want to compare the balance of an address after
// it executes a transaction, and you don't want to worry about accounting for
// balances changes due to paying for gas a.k.a. transaction fees.
const closeTo = async (
  a: BigNumberish,
  b: BigNumberish,
  margin: BigNumberish
) => {
  expect(a).to.be.closeTo(b, margin);
};
// ----------------------------------------------------------------------------

describe("SpaceCoin", () => {
  // See the Hardhat docs on fixture for why we're using them:
  // https://hardhat.org/hardhat-network-helpers/docs/reference#fixtures

  // In particular, they allow you to run your tests in parallel using
  // `npx hardhat test --parallel` without the error-prone side-effects
  // that come from using mocha's `beforeEach`
  async function setupFixture() {
    const [deployer, alice, bob, owner, treasury, ico]: SignerWithAddress[] =
      await ethers.getSigners();

    // NOTE: You may need to pass arguments to the `deploy` function, if your
    //       ICO contract's constructor has input parameters
    // const ICO = await ethers.getContractFactory("ICO");
    // const ico: ICO = (await ICO.deploy(/* FILL_ME_IN: */)) as ICO;
    // await ico.deployed();

    // NOTE: You may need to pass arguments to the `deploy` function, if your
    //       SpaceCoin contract's constructor has input parameters
    const SpaceCoin = await ethers.getContractFactory("SpaceCoin");
    const spaceCoin: SpaceCoin = (await SpaceCoin.deploy(
      owner.address,
      treasury.address,
      ico.address
    )) as SpaceCoin;
    await spaceCoin.deployed();

    return { ico, spaceCoin, deployer, alice, bob, treasury, owner };
  }

  describe("Deployment & Test Setup", () => {
    it("Deploys a contract", async () => {
      // NOTE: We don't need to extract spaceCoin here because we don't use it
      // in this test. However, we'll need to extract it in tests that require it.
      const { spaceCoin, deployer, alice, bob } = await loadFixture(
        setupFixture
      );

      expect(spaceCoin.address).to.be.properAddress;
    });

    // it("Flags floating promises", async () => {
    //   // NOTE: This test is just for demonstrating/confirming that eslint is
    //   // set up to warn about floating promises.
    //   const { spaceCoin, deployer, alice, bob } = await loadFixture(
    //     setupFixture
    //   );

    //   const txReceiptUnresolved = await spaceCoin
    //     .connect(alice)
    //     .hinkleFinkleDo();
    //   expect(txReceiptUnresolved.wait()).to.be.reverted;
    // });
  });

  describe("SpaceCoin - Contract creation", () => {
    it("has the name as 'SpaceCoin'", async () => {
      const { spaceCoin } = await loadFixture(setupFixture);
      expect(await spaceCoin.name()).to.equal("SpaceCoin");
    });

    it("has the symbol as 'SPC'", async () => {
      const { spaceCoin } = await loadFixture(setupFixture);
      expect(await spaceCoin.symbol()).to.equal("SPC");
    });

    it("Mints 150_000 * 10^18 tokens to ico", async () => {
      const { spaceCoin, ico } = await loadFixture(setupFixture);
      expect(await spaceCoin.balanceOf(ico.address)).to.equal(
        ONE_ETHER.mul(150_000)
      );
    });

    it("Mints 350_000 * 10^18 tokens to treasury", async () => {
      const { spaceCoin, treasury } = await loadFixture(setupFixture);
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(
        ONE_ETHER.mul(350_000)
      );
    });

    it("has a total supply of 500_000 * 10^18 tokens", async () => {
      const { spaceCoin } = await loadFixture(setupFixture);
      expect(await spaceCoin.totalSupply()).to.equal(ONE_ETHER.mul(500_000));
    });

    it("Sets the owner variable", async () => {
      const { spaceCoin, owner } = await loadFixture(setupFixture);
      expect(await spaceCoin.OWNER()).to.equal(owner.address);
    });

    it("Sets the treasury variable", async () => {
      const { spaceCoin, treasury } = await loadFixture(setupFixture);
      expect(await spaceCoin.TREASURY()).to.equal(treasury.address);
    });

    it("Transfer tax is not enabled", async () => {
      const { spaceCoin } = await loadFixture(setupFixture);
      expect(await spaceCoin.isTransferTaxEnabled()).to.be.false;
    });

    it("Transfer tax percent is 2", async () => {
      const { spaceCoin } = await loadFixture(setupFixture);
      expect(await spaceCoin.TRANSFER_TAX_PERCENT()).to.equal(2);
    });
  });

  describe("SpaceCoin - transfer tax toggling", () => {
    it("Owner can toggle transfer tax", async () => {
      const { spaceCoin, owner } = await loadFixture(setupFixture);

      expect(await spaceCoin.isTransferTaxEnabled()).to.equal(false);

      await spaceCoin.connect(owner).setTransferTax(true);
      expect(await spaceCoin.isTransferTaxEnabled()).to.equal(true);

      await spaceCoin.connect(owner).setTransferTax(false);
      expect(await spaceCoin.isTransferTaxEnabled()).to.equal(false);
    });

    it("Toggling transfer tax emits 'TransferTaxSet' event", async () => {
      const { spaceCoin, owner } = await loadFixture(setupFixture);
      await expect(spaceCoin.connect(owner).setTransferTax(true))
        .to.emit(spaceCoin, "TransferTaxSet")
        .withArgs(true);
    });

    it("Non owners can't enable transfer tax", async () => {
      const { spaceCoin, alice } = await loadFixture(setupFixture);

      await expect(
        spaceCoin.connect(alice).setTransferTax(true)
      ).to.be.revertedWith("only owner allowed");
    });

    it("can't set transfer tax if already set", async () => {
      const { spaceCoin, owner } = await loadFixture(setupFixture);

      expect(await spaceCoin.isTransferTaxEnabled()).to.equal(false);

      await expect(
        spaceCoin.connect(owner).setTransferTax(false)
      ).to.be.revertedWith("transfer tax value is same as desired");
      expect(await spaceCoin.isTransferTaxEnabled()).to.equal(false);

      await spaceCoin.connect(owner).setTransferTax(true);
      expect(await spaceCoin.isTransferTaxEnabled()).to.equal(true);
    });
  });

  describe("Tax off - transfers", () => {
    it("transfer does not take fee into accounting", async () => {
      const amount: BigNumber = ONE_ETHER.mul(500);
      const { spaceCoin, treasury, alice } = await loadFixture(setupFixture);
      const treasuryBalanceInitial: BigNumber = await spaceCoin.balanceOf(
        treasury.address
      );
      const aliceBalanceInitial: BigNumber = await spaceCoin.balanceOf(
        alice.address
      );
      await spaceCoin.connect(treasury).transfer(alice.address, amount);
      const treasuryBalanceFinal: BigNumber = await spaceCoin.balanceOf(
        treasury.address
      );
      const aliceBalanceFinal: BigNumber = await spaceCoin.balanceOf(
        alice.address
      );
      expect(treasuryBalanceFinal).to.equal(treasuryBalanceInitial.sub(amount));
      expect(aliceBalanceFinal).to.equal(aliceBalanceInitial.add(amount));
    });

    it("transferFrom does not take fee into accounting", async () => {
      const amount: BigNumber = ONE_ETHER.mul(500);
      const { spaceCoin, treasury, alice, bob } = await loadFixture(
        setupFixture
      );
      const treasuryBalanceInitial: BigNumber = await spaceCoin.balanceOf(
        treasury.address
      );
      const aliceBalanceInitial: BigNumber = await spaceCoin.balanceOf(
        alice.address
      );
      await spaceCoin.connect(treasury).increaseAllowance(bob.address, amount);
      expect(await spaceCoin.allowance(treasury.address, bob.address)).to.equal(
        amount
      );
      await spaceCoin
        .connect(bob)
        .transferFrom(treasury.address, alice.address, amount);
      const treasuryBalanceFinal: BigNumber = await spaceCoin.balanceOf(
        treasury.address
      );
      const aliceBalanceFinal: BigNumber = await spaceCoin.balanceOf(
        alice.address
      );
      expect(treasuryBalanceFinal).to.equal(treasuryBalanceInitial.sub(amount));
      expect(aliceBalanceFinal).to.equal(aliceBalanceInitial.add(amount));
    });
  });

  describe("Tax on - transfers", () => {
    it("transfer takes fee into accounting", async () => {
      const amount: BigNumber = ONE_ETHER.mul(500);
      const tax: BigNumber = amount.mul(2).div(100);
      const remainingAmount: BigNumber = amount.mul(98).div(100);
      const { spaceCoin, owner, alice, treasury } = await loadFixture(
        setupFixture
      );
      await spaceCoin.connect(owner).setTransferTax(true);
      const treasuryBalanceInitial: BigNumber = await spaceCoin.balanceOf(
        treasury.address
      );
      const aliceBalanceInitial: BigNumber = await spaceCoin.balanceOf(
        alice.address
      );
      await spaceCoin.connect(treasury).transfer(alice.address, amount);
      const treasuryBalanceFinal: BigNumber = await spaceCoin.balanceOf(
        treasury.address
      );
      const aliceBalanceFinal: BigNumber = await spaceCoin.balanceOf(
        alice.address
      );
      expect(treasuryBalanceFinal).to.equal(
        treasuryBalanceInitial.add(tax).sub(amount)
      );
      expect(aliceBalanceFinal).to.equal(remainingAmount);
    });

    it("transferFrom takes fee into accounting", async () => {
      const amount: BigNumber = ONE_ETHER.mul(500);
      const tax: BigNumber = amount.mul(2).div(100);
      const remainingAmount: BigNumber = amount.mul(98).div(100);
      const { spaceCoin, owner, treasury, alice, bob } = await loadFixture(
        setupFixture
      );

      await spaceCoin.connect(owner).setTransferTax(true);
      const treasuryBalanceInitial: BigNumber = await spaceCoin.balanceOf(
        treasury.address
      );
      const aliceBalanceInitial: BigNumber = await spaceCoin.balanceOf(
        alice.address
      );
      await spaceCoin.connect(treasury).increaseAllowance(bob.address, amount);
      await spaceCoin
        .connect(bob)
        .transferFrom(treasury.address, alice.address, amount);
      const treasuryBalanceFinal: BigNumber = await spaceCoin.balanceOf(
        treasury.address
      );
      const aliceBalanceFinal: BigNumber = await spaceCoin.balanceOf(
        alice.address
      );
      expect(treasuryBalanceFinal).to.equal(
        treasuryBalanceInitial.sub(amount).add(tax)
      );
      expect(aliceBalanceFinal).to.equal(remainingAmount);
    });

    it("transferFrom can't transfer more than allowance", async () => {
      const amount: BigNumber = ONE_ETHER.mul(500);
      const tax: BigNumber = amount.mul(2).div(100);
      const remainingAmount: BigNumber = amount.mul(98).div(100);
      const { spaceCoin, owner, treasury, alice, bob } = await loadFixture(
        setupFixture
      );

      await spaceCoin.connect(owner).setTransferTax(true);
      const treasuryBalanceInitial: BigNumber = await spaceCoin.balanceOf(
        treasury.address
      );
      const aliceBalanceInitial: BigNumber = await spaceCoin.balanceOf(
        alice.address
      );
      await spaceCoin.connect(treasury).increaseAllowance(bob.address, amount);
      await expect(
        spaceCoin
          .connect(bob)
          .transferFrom(treasury.address, alice.address, amount.add(1))
      ).to.be.revertedWith("ERC20: insufficient allowance");
      const treasuryBalanceFinal: BigNumber = await spaceCoin.balanceOf(
        treasury.address
      );
      const aliceBalanceFinal: BigNumber = await spaceCoin.balanceOf(
        alice.address
      );
      expect(treasuryBalanceFinal).to.equal(treasuryBalanceInitial);
      expect(aliceBalanceFinal).to.equal(aliceBalanceInitial);
    });
  });
});
