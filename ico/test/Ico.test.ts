import { typeSignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
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
import { BigNumber, BigNumberish, Wallet } from "ethers";
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

const ICO_PHASE: any = {
  SEED: 0,
  GENERAL: 1,
  OPEN: 2,
};

const getSpaceCoinFromIcoAddress = async (icoAddress: string) => {
  const ico: ICO = (await ethers.getContractAt("ICO", icoAddress)) as ICO;

  const spaceCoinAddress: string = await ico.SPC_TOKEN_ADDRESS();

  const spaceCoin: SpaceCoin = (await ethers.getContractAt(
    "SpaceCoin",
    spaceCoinAddress
  )) as SpaceCoin;
  return spaceCoin;
};
// ----------------------------------------------------------------------------

describe("ICO", () => {
  // See the Hardhat docs on fixture for why we're using them:
  // https://hardhat.org/hardhat-network-helpers/docs/reference#fixtures

  // In particular, they allow you to run your tests in parallel using
  // `npx hardhat test --parallel` without the error-prone side-effects
  // that come from using mocha's `beforeEach`
  async function setupFixture() {
    const [deployer, alice, bob, owner, treasury, sam]: SignerWithAddress[] =
      await ethers.getSigners();

    // NOTE: You may need to pass arguments to the `deploy` function, if your
    //       ICO contract's constructor has input parameters
    const ICO = await ethers.getContractFactory("ICO");
    const ico: ICO = (await ICO.connect(owner).deploy(treasury.address)) as ICO;
    await ico.deployed();

    // NOTE: You may need to pass arguments to the `deploy` function, if your
    //       SpaceCoin contract's constructor has input parameters
    // const SpaceCoin = await ethers.getContractFactory("SpaceCoin");
    // const spaceCoin: SpaceCoin = (await SpaceCoin.deploy(
    //   owner.address,
    //   treasury.address,
    //   ico.address
    // )) as SpaceCoin;
    // await spaceCoin.deployed();

    const spaceCoinAddress: string = await ico.SPC_TOKEN_ADDRESS();

    const spaceCoin: SpaceCoin = (await ethers.getContractAt(
      "SpaceCoin",
      spaceCoinAddress
    )) as SpaceCoin;

    return { ico, spaceCoin, deployer, alice, bob, owner, treasury, sam };
  }

  describe("Deployment & Test Setup", () => {
    it("Deploys a contract", async () => {
      const { ico } = await loadFixture(setupFixture);

      expect(ico.address).to.be.properAddress;
    });

    it("Deploys a SpaceCoin contract", async () => {
      const { spaceCoin } = await loadFixture(setupFixture);

      expect(spaceCoin.address).to.be.properAddress;
    });

    // it("Flags floating promises", async () => {
    //   // NOTE: This test is just for demonstrating/confirming that eslint is
    //   // set up to warn about floating promises.
    //   const { ico, deployer, alice, bob } = await loadFixture(setupFixture);

    //   const txReceiptUnresolved = await ico.connect(alice).advancePhase();
    //   expect(txReceiptUnresolved.wait()).to.be.reverted;
    // });
  });

  describe("ICO - contract creation", () => {
    it("set the owner correctly", async () => {
      const { ico, owner } = await loadFixture(setupFixture);
      expect(await ico.OWNER()).equal(owner.address);
    });

    it("deploys SpaceCoin", async () => {
      const { ico, treasury } = await loadFixture(setupFixture);
      const spaceCoin: SpaceCoin = await getSpaceCoinFromIcoAddress(
        ico.address
      );
      expect(spaceCoin.address).to.be.properAddress;
      expect(await spaceCoin.TREASURY()).to.equal(treasury.address);
    });

    it("mints 150_000 * 10 ** 18 tokens to ICO contract", async () => {
      const { ico, spaceCoin } = await loadFixture(setupFixture);

      expect(await spaceCoin.balanceOf(ico.address)).equal(
        ONE_ETHER.mul(150_000)
      );
    });

    it("mints 350_000 * 10 ** 18 tokens to treasury contract", async () => {
      const { ico, spaceCoin, treasury } = await loadFixture(setupFixture);

      expect(await spaceCoin.balanceOf(treasury.address)).equal(
        ONE_ETHER.mul(350_000)
      );
    });

    it("total supply of SPC token is 500_000 * 10 ** 18 tokens", async () => {
      const { ico, spaceCoin, treasury } = await loadFixture(setupFixture);

      expect(await spaceCoin.totalSupply()).equal(ONE_ETHER.mul(500_000));
    });
  });

  describe("ICO - Pause/Resume fundraising and SPC redemptions", () => {
    it("only owner can pause fundraising and SPC redemption", async () => {
      const { ico, owner } = await loadFixture(setupFixture);

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);

      await ico.connect(owner).pauseFundraisingAndSpcRedemption();

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(true);
    });

    it("owner can't pause fundraising and SPC redemption when it's already paused", async () => {
      const { ico, owner } = await loadFixture(setupFixture);

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);

      await ico.connect(owner).pauseFundraisingAndSpcRedemption();

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(true);

      await expect(
        ico.connect(owner).pauseFundraisingAndSpcRedemption()
      ).to.be.revertedWith("fund raising and spc redemption is paused");

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(true);
    });

    it("non owner can't pause fundraising and SPC redemption", async () => {
      const { ico, alice } = await loadFixture(setupFixture);

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);

      await expect(
        ico.connect(alice).pauseFundraisingAndSpcRedemption()
      ).to.be.revertedWith("only owner allowed");

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);
    });

    it("only owner can resume fundraising and SPC redemption", async () => {
      const { ico, owner } = await loadFixture(setupFixture);

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);

      await ico.connect(owner).pauseFundraisingAndSpcRedemption();

      await ico.connect(owner).resumeFundraisingAndSpcRedemption();

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);
    });

    it("owner can't resume fundraising and SPC redemption when it's active", async () => {
      const { ico, owner } = await loadFixture(setupFixture);

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);

      await expect(ico.resumeFundraisingAndSpcRedemption()).to.be.revertedWith(
        "fund raising and spc redemption is active"
      );

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);
    });

    it("non owner can't resume fundraising and SPC redemption", async () => {
      const { ico, alice } = await loadFixture(setupFixture);

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);

      await expect(
        ico.connect(alice).resumeFundraisingAndSpcRedemption()
      ).to.be.revertedWith("only owner allowed");

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);
    });

    it("pause fundraising and SPC redemption emits 'FundraisingAndSpcRedemptionPaused' event", async () => {
      const { ico, owner } = await loadFixture(setupFixture);

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);

      await expect(
        ico.connect(owner).pauseFundraisingAndSpcRedemption()
      ).to.emit(ico, "FundraisingAndSpcRedemptionPaused");

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(true);
    });

    it("resume fundraising and SPC redemption emits 'FundRaisingAndSpcRedemptionResumed' event", async () => {
      const { ico, owner } = await loadFixture(setupFixture);

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(false);

      await expect(
        ico.connect(owner).pauseFundraisingAndSpcRedemption()
      ).to.emit(ico, "FundraisingAndSpcRedemptionPaused");

      expect(await ico.isFundraisingAndSpcRedemptionPaused()).equal(true);

      await expect(
        ico.connect(owner).resumeFundraisingAndSpcRedemption()
      ).to.emit(ico, "FundRaisingAndSpcRedemptionResumed");
    });
  });

  describe("ICO - Phase advancement", () => {
    it("only owner can advance phase", async () => {
      const { ico, owner } = await loadFixture(setupFixture);

      expect(await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL)).to.be.ok;
    });

    it("reverts when advancing phase to invalid phase", async () => {
      const { ico, owner } = await loadFixture(setupFixture);

      await expect(ico.connect(owner).advancePhase(3)).to.be.revertedWith(
        "invalid phase"
      );
    });

    it("reverts when trying to advance phase to current phase", async () => {
      const { ico, owner } = await loadFixture(setupFixture);

      await expect(
        ico.connect(owner).advancePhase(ICO_PHASE.SEED)
      ).to.be.revertedWith("current phase is same as desired phase");
    });

    it("reverts when trying to advance phase from SEED phase to OPEN phase", async () => {
      const { ico, owner } = await loadFixture(setupFixture);

      await expect(
        ico.connect(owner).advancePhase(ICO_PHASE.OPEN)
      ).to.be.revertedWith("can only move from SEED to GENERAL");
    });

    it("reverts when trying to advance phase from GENERAL phase to SEED phase", async () => {
      const { ico, owner } = await loadFixture(setupFixture);
      expect(await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL)).to.be.ok;
      await expect(
        ico.connect(owner).advancePhase(ICO_PHASE.SEED)
      ).to.be.revertedWith("can only move from GENERAL to OPEN");
    });

    it("non owner can't advance phase", async () => {
      const { ico, alice } = await loadFixture(setupFixture);

      await expect(
        ico.connect(alice).advancePhase(ICO_PHASE.GENERAL)
      ).to.be.revertedWith("only owner allowed");
    });

    it("owner can move from seed phase to general phase", async () => {
      const { ico, owner } = await loadFixture(setupFixture);
      expect(await ico.currentPhase()).equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);
      expect(await ico.currentPhase()).equal(ICO_PHASE.GENERAL);
    });

    it("owner can move from general phase to open phase", async () => {
      const { ico, owner } = await loadFixture(setupFixture);
      expect(await ico.currentPhase()).equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).equal(ICO_PHASE.GENERAL);

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(await ico.currentPhase()).equal(ICO_PHASE.OPEN);
    });

    it("owner can't advance phase from open phase", async () => {
      const { ico, owner } = await loadFixture(setupFixture);
      expect(await ico.currentPhase()).equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).equal(ICO_PHASE.GENERAL);

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(await ico.currentPhase()).equal(ICO_PHASE.OPEN);

      await expect(
        ico.connect(owner).advancePhase(ICO_PHASE.GENERAL)
      ).to.be.revertedWith("can't advance phase after open");
    });

    it("advancing phase emit 'PhaseChanged' event", async () => {
      const { ico, owner } = await loadFixture(setupFixture);

      await expect(ico.connect(owner).advancePhase(ICO_PHASE.GENERAL)).to.emit(
        ico,
        "PhaseChanged"
      );
    });
  });

  describe("ICO - Managing private contributors", () => {
    it("only owner can add private contributors", async () => {
      const { ico, owner, alice, bob, sam } = await loadFixture(setupFixture);

      const privateContributors: Array<string> = [alice.address, bob.address];

      expect(
        await ico.connect(owner).addPrivateContributors(privateContributors)
      ).to.be.ok;

      expect(await ico.isPrivateContributor(alice.address)).to.be.true;
      expect(await ico.isPrivateContributor(bob.address)).to.be.true;
      expect(await ico.isPrivateContributor(sam.address)).to.be.false;
      expect(await ico.isPrivateContributor(owner.address)).to.be.false;
    });

    it("non owner can't add private contributors", async () => {
      const { ico, alice, bob, sam } = await loadFixture(setupFixture);

      const privateContributors: Array<string> = [alice.address, bob.address];

      await expect(
        ico.connect(sam).addPrivateContributors(privateContributors)
      ).to.be.revertedWith("only owner allowed");
    });

    //
    it("adding private contributors emit 'PrivateContributorsAdded' event", async () => {
      const { ico, owner, alice, bob, sam } = await loadFixture(setupFixture);

      const privateContributors: Array<string> = [alice.address, bob.address];

      await expect(
        ico.connect(owner).addPrivateContributors(privateContributors)
      ).to.emit(ico, "PrivateContributorsAdded");
    });
  });

  describe("ICO - Contributions", () => {
    it("only private contributor can contribute during SEED phase", async () => {
      const { ico, alice, bob, sam, owner } = await loadFixture(setupFixture);

      const privateContributors: Array<string> = [alice.address, bob.address];

      await ico.connect(owner).addPrivateContributors(privateContributors);

      expect(await ico.connect(alice).contribute({ value: ONE_ETHER })).to.be
        .ok;

      expect(await ico.currentTotalContribution()).equal(ONE_ETHER);

      expect(await ico.contributions(alice.address)).equal(ONE_ETHER);

      expect(await ico.connect(bob).contribute({ value: ONE_ETHER.mul(3) })).to
        .be.ok;

      expect(await ico.currentTotalContribution()).equal(ONE_ETHER.mul(4));

      expect(await ico.contributions(bob.address)).equal(ONE_ETHER.mul(3));
    });

    it("non private contributors can't contribute during SEED phase", async () => {
      const { ico, alice, bob, sam, owner } = await loadFixture(setupFixture);

      const privateContributors: Array<string> = [alice.address, bob.address];

      await ico.connect(owner).addPrivateContributors(privateContributors);
      await expect(
        ico.connect(sam).contribute({ value: ONE_ETHER })
      ).to.be.revertedWith("not a private investor");

      await expect(
        ico.connect(owner).contribute({ value: ONE_ETHER })
      ).to.be.revertedWith("not a private investor");
    });

    it("can't contribute when ICO is paused", async () => {
      const { ico, alice, bob, sam, owner } = await loadFixture(setupFixture);

      const privateContributors: Array<string> = [alice.address, bob.address];

      await ico.connect(owner).pauseFundraisingAndSpcRedemption();
      await ico.connect(owner).addPrivateContributors(privateContributors);

      await expect(
        ico.connect(alice).contribute({ value: ONE_ETHER })
      ).to.be.revertedWith("fund raising and spc redemption is paused");

      await expect(
        ico.connect(owner).contribute({ value: ONE_ETHER })
      ).to.be.revertedWith("fund raising and spc redemption is paused");

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      await expect(
        ico.connect(alice).contribute({ value: ONE_ETHER })
      ).to.be.revertedWith("fund raising and spc redemption is paused");

      await expect(
        ico.connect(owner).contribute({ value: ONE_ETHER })
      ).to.be.revertedWith("fund raising and spc redemption is paused");

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      await expect(
        ico.connect(alice).contribute({ value: ONE_ETHER })
      ).to.be.revertedWith("fund raising and spc redemption is paused");

      await expect(
        ico.connect(owner).contribute({ value: ONE_ETHER })
      ).to.be.revertedWith("fund raising and spc redemption is paused");
    });

    it("reverts on no contribution amount", async () => {
      const { ico, alice, bob, sam, owner } = await loadFixture(setupFixture);

      const privateContributors: Array<string> = [alice.address, bob.address];

      await ico.connect(owner).addPrivateContributors(privateContributors);

      await expect(
        ico.connect(alice).contribute({ value: 0 })
      ).to.be.revertedWith("no amount contributed");
    });

    it("total contributions during SEED phase can't exceed 15000 ether", async () => {
      const { ico, alice, bob, sam, owner } = await loadFixture(setupFixture);

      const extraAccounts: Array<SignerWithAddress> = await ethers.getSigners();

      const extraAddresses: Array<string> = extraAccounts.map(
        (item) => item.address
      );

      const privateContributorsAccounts: Array<SignerWithAddress> = [
        ...extraAccounts,
        alice,
        bob,
      ];

      const privateContributorsWithAddresses: Array<string> = [
        ...extraAddresses,
        alice.address,
        bob.address,
      ];

      await ico
        .connect(owner)
        .addPrivateContributors(privateContributorsWithAddresses);

      for (let i = 0; i < 14; i++) {
        await ico
          .connect(privateContributorsAccounts[i])
          .contribute({ value: ONE_ETHER.mul(1000) });
      }

      const contributor: SignerWithAddress = privateContributorsAccounts[19];

      expect(await ico.currentTotalContribution()).equal(ONE_ETHER.mul(14000));

      expect(
        await ico.contributions(privateContributorsWithAddresses[0])
      ).equal(ONE_ETHER.mul(1000));

      expect(await ico.contributions(contributor.address)).equal(0);

      await expect(
        ico.connect(contributor).contribute({ value: ONE_ETHER.mul(1200) })
      ).to.be.revertedWith("seed phase - total contribution limit exceeded");

      expect(
        await ico
          .connect(contributor)
          .contribute({ value: ONE_ETHER.mul(1000) })
      ).to.be.ok;
    });

    it("individual contributions during SEED phase can't exceed 1500 ether", async () => {
      const { ico, alice, bob, sam, owner } = await loadFixture(setupFixture);

      await ico
        .connect(owner)
        .addPrivateContributors([alice.address, bob.address, sam.address]);

      expect(await ico.contributions(alice.address)).equal(0);

      expect(
        await ico.connect(alice).contribute({ value: ONE_ETHER.mul(1500) })
      ).to.be.ok;

      await expect(
        ico.connect(alice).contribute({ value: 1 })
      ).to.be.revertedWith(
        "seed phase - individual contribution limit exceeded"
      );
    });

    it("total contributions during GENERAL phase can't exceed 30000 ether", async () => {
      const { ico, alice, bob, sam, owner } = await loadFixture(setupFixture);

      const extraAccounts: Array<SignerWithAddress> = await ethers.getSigners();

      const extraAddresses: Array<string> = extraAccounts.map(
        (item) => item.address
      );

      const privateContributorsAccounts: Array<any> = [
        ...extraAccounts,
        alice,
        bob,
      ];

      const privateContributorsWithAddresses: Array<string> = [
        ...extraAddresses,
        alice.address,
        bob.address,
      ];

      await ico
        .connect(owner)
        .addPrivateContributors(privateContributorsWithAddresses);

      for (let i = 0; i < 10; i++) {
        await ico
          .connect(privateContributorsAccounts[i])
          .contribute({ value: ONE_ETHER.mul(1500) });
      }
      expect(await ico.currentTotalContribution()).equal(ONE_ETHER.mul(15000));

      expect(
        await ico.contributions(privateContributorsWithAddresses[0])
      ).equal(ONE_ETHER.mul(1500));

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).equal(1);

      const contributor: SignerWithAddress = privateContributorsAccounts[39];

      for (let i = 11; i < 25; i++) {
        await ico
          .connect(privateContributorsAccounts[i])
          .contribute({ value: ONE_ETHER.mul(1000) });
      }

      expect(await ico.currentTotalContribution()).equal(ONE_ETHER.mul(29000));

      await ico
        .connect(privateContributorsAccounts[25])
        .contribute({ value: ONE_ETHER.mul(800) });

      expect(await ico.currentTotalContribution()).equal(ONE_ETHER.mul(29800));

      expect(await ico.contributions(contributor.address)).equal(0);

      await expect(
        ico.connect(contributor).contribute({ value: ONE_ETHER.mul(300) })
      ).to.be.revertedWith("general phase - total contribution limit exceeded");

      expect(
        await ico.connect(contributor).contribute({ value: ONE_ETHER.mul(200) })
      ).to.be.ok;
    });

    it("individual contributions during GENERAL phase can't exceed 1000 ether", async () => {
      const { ico, alice, bob, sam, owner } = await loadFixture(setupFixture);

      await ico
        .connect(owner)
        .addPrivateContributors([alice.address, bob.address]);

      expect(await ico.contributions(alice.address)).equal(0);

      expect(
        await ico.connect(alice).contribute({ value: ONE_ETHER.mul(1500) })
      ).to.be.ok;

      expect(await ico.contributions(alice.address)).equal(ONE_ETHER.mul(1500));

      expect(await ico.connect(bob).contribute({ value: ONE_ETHER.mul(999) }))
        .to.be.ok;

      expect(await ico.contributions(bob.address)).equal(ONE_ETHER.mul(999));

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).equal(ICO_PHASE.GENERAL);

      await expect(
        ico.connect(alice).contribute({ value: 1 })
      ).to.be.revertedWith(
        "general phase - individual contribution limit exceeded"
      );

      expect(await ico.contributions(alice.address)).equal(ONE_ETHER.mul(1500));

      await expect(
        ico.connect(sam).contribute({ value: ONE_ETHER.mul(1001) })
      ).to.be.revertedWith(
        "general phase - individual contribution limit exceeded"
      );

      expect(await ico.contributions(sam.address)).equal(0);

      await expect(
        ico.connect(bob).contribute({ value: ONE_ETHER.mul(2) })
      ).to.be.revertedWith(
        "general phase - individual contribution limit exceeded"
      );

      expect(await ico.contributions(bob.address)).equal(ONE_ETHER.mul(999));

      expect(await ico.connect(sam).contribute({ value: ONE_ETHER })).to.be.ok;

      expect(await ico.contributions(sam.address)).equal(ONE_ETHER);

      expect(await ico.connect(bob).contribute({ value: ONE_ETHER })).to.be.ok;

      expect(await ico.contributions(bob.address)).equal(ONE_ETHER.mul(1000));
    });

    it("total contributions during OPEN phase can't exceed 30000 ether", async () => {
      const { ico, alice, bob, sam, owner } = await loadFixture(setupFixture);

      const extraAccounts: Array<SignerWithAddress> = await ethers.getSigners();

      const extraAddresses: Array<string> = extraAccounts.map(
        (item) => item.address
      );

      const privateContributorsAccounts: Array<any> = [
        ...extraAccounts,
        alice,
        bob,
      ];

      const privateContributorsWithAddresses: Array<string> = [
        ...extraAddresses,
        alice.address,
        bob.address,
      ];

      await ico
        .connect(owner)
        .addPrivateContributors(privateContributorsWithAddresses);

      for (let i = 0; i < 10; i++) {
        await ico
          .connect(privateContributorsAccounts[i])
          .contribute({ value: ONE_ETHER.mul(1500) });
      }
      expect(await ico.currentTotalContribution()).equal(ONE_ETHER.mul(15000));

      expect(
        await ico.contributions(privateContributorsWithAddresses[0])
      ).equal(ONE_ETHER.mul(1500));

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).equal(ICO_PHASE.GENERAL);

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(await ico.currentPhase()).equal(ICO_PHASE.OPEN);

      const contributor: SignerWithAddress = privateContributorsAccounts[39];

      for (let i = 11; i < 25; i++) {
        await ico
          .connect(privateContributorsAccounts[i])
          .contribute({ value: ONE_ETHER.mul(1000) });
      }

      expect(await ico.currentTotalContribution()).equal(ONE_ETHER.mul(29000));

      await ico
        .connect(privateContributorsAccounts[25])
        .contribute({ value: ONE_ETHER.mul(800) });

      expect(await ico.currentTotalContribution()).equal(ONE_ETHER.mul(29800));

      expect(await ico.contributions(contributor.address)).equal(0);

      await expect(
        ico.connect(contributor).contribute({ value: ONE_ETHER.mul(300) })
      ).to.be.revertedWith("open phase - total contribution limit exceeded");

      expect(
        await ico.connect(contributor).contribute({ value: ONE_ETHER.mul(200) })
      ).to.be.ok;

      await expect(
        ico.connect(contributor).contribute({ value: 1 })
      ).to.be.revertedWith("open phase - total contribution limit exceeded");
    });
  });

  describe("ICO - Redeem tokens", async () => {
    it("can't redeem in SEED phase", async () => {
      const { ico, alice, owner } = await loadFixture(setupFixture);

      expect(await ico.currentPhase()).to.be.equal(0);

      await expect(ico.connect(alice).redeemToken()).to.be.revertedWith(
        "can redeem only during open phase"
      );

      await expect(ico.connect(owner).redeemToken()).to.be.revertedWith(
        "can redeem only during open phase"
      );
    });

    it("can't redeem in GENERAL phase", async () => {
      const { ico, alice, owner } = await loadFixture(setupFixture);

      expect(await ico.currentPhase()).to.be.equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.GENERAL);

      await expect(ico.connect(alice).redeemToken()).to.be.revertedWith(
        "can redeem only during open phase"
      );

      await expect(ico.connect(owner).redeemToken()).to.be.revertedWith(
        "can redeem only during open phase"
      );
    });

    it("can't redeem when redemption is paused", async () => {
      const { ico, alice, owner } = await loadFixture(setupFixture);

      await ico.connect(owner).pauseFundraisingAndSpcRedemption();

      expect(await ico.currentPhase()).to.be.equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.GENERAL);

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.OPEN);

      await expect(ico.connect(alice).redeemToken()).to.be.revertedWith(
        "fund raising and spc redemption is paused"
      );
    });

    it("can't redeem when no contribution is made", async () => {
      const { ico, alice, owner } = await loadFixture(setupFixture);

      expect(await ico.currentPhase()).to.be.equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.GENERAL);

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.OPEN);

      await expect(ico.connect(alice).redeemToken()).to.be.revertedWith(
        "no contributions made"
      );
    });

    it("can redeem correct tokens in open phase - tax off", async () => {
      const { ico, alice, owner, spaceCoin, treasury } = await loadFixture(
        setupFixture
      );

      expect(await ico.currentPhase()).to.be.equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.GENERAL);

      await expect(ico.connect(alice).redeemToken()).to.be.revertedWith(
        "can redeem only during open phase"
      );

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.OPEN);

      const aliceBalanceBefore = await spaceCoin.balanceOf(alice.address);
      const treasuryBalanceBefore = await spaceCoin.balanceOf(treasury.address);

      expect(aliceBalanceBefore).to.equal(0);

      await ico.connect(alice).contribute({ value: ONE_ETHER.mul(33) });

      await ico.connect(alice).redeemToken();

      const aliceBalanceAfter = await spaceCoin.balanceOf(alice.address);
      const treasuryBalanceAfter = await spaceCoin.balanceOf(treasury.address);

      expect(aliceBalanceAfter).to.equal(ONE_ETHER.mul(33 * 5));

      expect(treasuryBalanceBefore).to.equal(treasuryBalanceAfter);
    });

    it("can redeem correct tokens in open phase - tax on", async () => {
      const { ico, alice, owner, spaceCoin, treasury } = await loadFixture(
        setupFixture
      );

      expect(await ico.currentPhase()).to.be.equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.GENERAL);

      await expect(ico.connect(alice).redeemToken()).to.be.revertedWith(
        "can redeem only during open phase"
      );

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.OPEN);
      await spaceCoin.connect(owner).setTransferTax(true);

      const aliceBalanceBefore = await spaceCoin.balanceOf(alice.address);
      const treasuryBalanceBefore = await spaceCoin.balanceOf(treasury.address);

      expect(aliceBalanceBefore).to.equal(0);

      await ico.connect(alice).contribute({ value: ONE_ETHER.mul(33) });

      await ico.connect(alice).redeemToken();

      const aliceBalanceAfter = await spaceCoin.balanceOf(alice.address);
      const treasuryBalanceAfter = await spaceCoin.balanceOf(treasury.address);

      expect(aliceBalanceAfter).to.equal(
        ONE_ETHER.mul(33 * 5).sub(ONE_ETHER.mul(33 * 5 * 2).div(100))
      );

      expect(treasuryBalanceAfter).to.equal(
        treasuryBalanceBefore.add(ONE_ETHER.mul(33 * 5 * 2).div(100))
      );
    });

    it("can redeem correct tokens two times in open phase - tax off", async () => {
      const { ico, alice, owner, spaceCoin, treasury } = await loadFixture(
        setupFixture
      );

      expect(await ico.currentPhase()).to.be.equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.GENERAL);

      await expect(ico.connect(alice).redeemToken()).to.be.revertedWith(
        "can redeem only during open phase"
      );

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.OPEN);

      expect(await spaceCoin.isTransferTaxEnabled()).to.be.false;

      const aliceBalanceBefore = await spaceCoin.balanceOf(alice.address);
      const treasuryBalanceBefore = await spaceCoin.balanceOf(treasury.address);

      expect(aliceBalanceBefore).to.equal(0);

      await ico.connect(alice).contribute({ value: ONE_ETHER.mul(33) });

      await ico.connect(alice).redeemToken();

      const aliceBalanceAfterFirstContribution = await spaceCoin.balanceOf(
        alice.address
      );
      const treasuryBalanceAfterFirstContribution = await spaceCoin.balanceOf(
        treasury.address
      );

      expect(aliceBalanceAfterFirstContribution).to.equal(
        ONE_ETHER.mul(33 * 5)
      );

      expect(treasuryBalanceAfterFirstContribution).to.equal(
        treasuryBalanceBefore
      );

      await ico.connect(alice).contribute({ value: ONE_ETHER.mul(30) });

      await ico.connect(alice).redeemToken();

      const aliceBalanceAfterSecondContribution = await spaceCoin.balanceOf(
        alice.address
      );
      const treasuryBalanceAfterSecondContribution = await spaceCoin.balanceOf(
        treasury.address
      );

      expect(aliceBalanceAfterSecondContribution).to.equal(
        aliceBalanceAfterFirstContribution.add(ONE_ETHER.mul(30 * 5))
      );

      expect(treasuryBalanceAfterSecondContribution).to.equal(
        treasuryBalanceAfterFirstContribution
      );

      expect(aliceBalanceAfterSecondContribution).to.equal(
        aliceBalanceBefore.add(ONE_ETHER.mul(33 * 5)).add(ONE_ETHER.mul(30 * 5))
      );

      expect(treasuryBalanceAfterSecondContribution).to.equal(
        treasuryBalanceBefore
      );
    });

    it("can redeem correct tokens two times in open phase - tax on", async () => {
      const { ico, alice, owner, spaceCoin, treasury } = await loadFixture(
        setupFixture
      );

      expect(await ico.currentPhase()).to.be.equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.GENERAL);

      await expect(ico.connect(alice).redeemToken()).to.be.revertedWith(
        "can redeem only during open phase"
      );

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.OPEN);

      expect(await spaceCoin.isTransferTaxEnabled()).to.be.false;

      await spaceCoin.connect(owner).setTransferTax(true);

      expect(await spaceCoin.isTransferTaxEnabled()).to.be.true;

      const aliceBalanceBefore = await spaceCoin.balanceOf(alice.address);
      const treasuryBalanceBefore = await spaceCoin.balanceOf(treasury.address);

      expect(aliceBalanceBefore).to.equal(0);

      await ico.connect(alice).contribute({ value: ONE_ETHER.mul(33) });

      await ico.connect(alice).redeemToken();

      const aliceBalanceAfterFirstContribution = await spaceCoin.balanceOf(
        alice.address
      );
      const treasuryBalanceAfterFirstContribution = await spaceCoin.balanceOf(
        treasury.address
      );

      expect(aliceBalanceAfterFirstContribution).to.equal(
        ONE_ETHER.mul(33 * 5).sub(ONE_ETHER.mul(33 * 5 * 2).div(100))
      );

      expect(treasuryBalanceAfterFirstContribution).to.equal(
        treasuryBalanceBefore.add(ONE_ETHER.mul(33 * 5 * 2).div(100))
      );

      await ico.connect(alice).contribute({ value: ONE_ETHER.mul(30) });

      await ico.connect(alice).redeemToken();

      const aliceBalanceAfterSecondContribution = await spaceCoin.balanceOf(
        alice.address
      );
      const treasuryBalanceAfterSecondContribution = await spaceCoin.balanceOf(
        treasury.address
      );

      expect(aliceBalanceAfterSecondContribution).to.equal(
        aliceBalanceAfterFirstContribution.add(
          ONE_ETHER.mul(30 * 5).sub(ONE_ETHER.mul(30 * 5 * 2).div(100))
        )
      );

      expect(treasuryBalanceAfterSecondContribution).to.equal(
        treasuryBalanceAfterFirstContribution.add(
          ONE_ETHER.mul(30 * 5 * 2).div(100)
        )
      );

      expect(aliceBalanceAfterSecondContribution).to.equal(
        aliceBalanceBefore
          .add(ONE_ETHER.mul(33 * 5))
          .add(ONE_ETHER.mul(30 * 5))
          .sub(ONE_ETHER.mul(33 * 5 * 2).div(100))
          .sub(ONE_ETHER.mul(30 * 5 * 2).div(100))
      );

      expect(treasuryBalanceAfterSecondContribution).to.equal(
        treasuryBalanceBefore
          .add(ONE_ETHER.mul(33 * 5 * 2).div(100))
          .add(ONE_ETHER.mul(30 * 5 * 2).div(100))
      );
    });

    it("can redeem correct tokens two times in open phase - tax on one time and off one time", async () => {
      const { ico, alice, owner, spaceCoin, treasury } = await loadFixture(
        setupFixture
      );

      expect(await ico.currentPhase()).to.be.equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.GENERAL);

      await expect(ico.connect(alice).redeemToken()).to.be.revertedWith(
        "can redeem only during open phase"
      );

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.OPEN);

      expect(await spaceCoin.isTransferTaxEnabled()).to.be.false;

      const aliceBalanceBefore = await spaceCoin.balanceOf(alice.address);
      const treasuryBalanceBefore = await spaceCoin.balanceOf(treasury.address);

      expect(aliceBalanceBefore).to.equal(0);

      await ico.connect(alice).contribute({ value: ONE_ETHER.mul(33) });

      await ico.connect(alice).redeemToken();

      const aliceBalanceAfterFirstContribution = await spaceCoin.balanceOf(
        alice.address
      );
      const treasuryBalanceAfterFirstContribution = await spaceCoin.balanceOf(
        treasury.address
      );

      expect(aliceBalanceAfterFirstContribution).to.equal(
        ONE_ETHER.mul(33 * 5)
      );

      expect(treasuryBalanceAfterFirstContribution).to.equal(
        treasuryBalanceBefore
      );

      await ico.connect(alice).contribute({ value: ONE_ETHER.mul(30) });

      await spaceCoin.connect(owner).setTransferTax(true);

      expect(await spaceCoin.isTransferTaxEnabled()).to.be.true;

      await ico.connect(alice).redeemToken();

      const aliceBalanceAfterSecondContribution = await spaceCoin.balanceOf(
        alice.address
      );
      const treasuryBalanceAfterSecondContribution = await spaceCoin.balanceOf(
        treasury.address
      );

      expect(aliceBalanceAfterSecondContribution).to.equal(
        aliceBalanceAfterFirstContribution.add(
          ONE_ETHER.mul(30 * 5).sub(ONE_ETHER.mul(30 * 5 * 2).div(100))
        )
      );

      expect(treasuryBalanceAfterSecondContribution).to.equal(
        treasuryBalanceAfterFirstContribution.add(
          ONE_ETHER.mul(30 * 5 * 2).div(100)
        )
      );

      expect(aliceBalanceAfterSecondContribution).to.equal(
        aliceBalanceBefore
          .add(ONE_ETHER.mul(33 * 5))
          .add(ONE_ETHER.mul(30 * 5))
          .sub(ONE_ETHER.mul(30 * 5 * 2).div(100))
      );

      expect(treasuryBalanceAfterSecondContribution).to.equal(
        treasuryBalanceBefore.add(ONE_ETHER.mul(30 * 5 * 2).div(100))
      );
    });

    it("redeem tokens in open phase emits 'TokenRedeemed' events", async () => {
      const { ico, alice, owner, spaceCoin, treasury } = await loadFixture(
        setupFixture
      );

      expect(await ico.currentPhase()).to.be.equal(0);

      await ico.connect(owner).advancePhase(ICO_PHASE.GENERAL);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.GENERAL);

      await expect(ico.connect(alice).redeemToken()).to.be.revertedWith(
        "can redeem only during open phase"
      );

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(await ico.currentPhase()).to.be.equal(ICO_PHASE.OPEN);

      const aliceBalanceBefore = await spaceCoin.balanceOf(alice.address);
      const treasuryBalanceBefore = await spaceCoin.balanceOf(treasury.address);

      expect(aliceBalanceBefore).to.equal(0);

      await ico.connect(alice).contribute({ value: ONE_ETHER.mul(33) });

      await expect(ico.connect(alice).redeemToken()).to.emit(
        ico,
        "TokenRedeemed"
      );

      const aliceBalanceAfter = await spaceCoin.balanceOf(alice.address);
      const treasuryBalanceAfter = await spaceCoin.balanceOf(treasury.address);

      expect(aliceBalanceAfter).to.equal(ONE_ETHER.mul(33 * 5));

      expect(treasuryBalanceBefore).to.equal(treasuryBalanceAfter);
    });
  });
});
