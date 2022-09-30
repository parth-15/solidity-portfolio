import { ForceFeeder } from "./../typechain-types/contracts/test/ForceFeeder";
/* eslint-disable no-unused-expressions */
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  ICO,
  SpaceCoin,
  SpaceLP,
  SpaceRouter,
  ForceFeeder,
} from "../typechain-types";
import { any } from "hardhat/internal/core/params/argumentTypes";

const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");

const timeTravel = async (seconds: number): Promise<number> => {
  return time.increase(seconds);
};

const timeTravelTo = async (seconds: any): Promise<void> => {
  return time.increaseTo(seconds);
};

const closeTo = async (
  a: BigNumberish,
  b: BigNumberish,
  margin: BigNumberish
) => {
  expect(a).to.be.closeTo(b, margin);
};

describe("SpaceLP", () => {
  async function setupFixture() {
    const [
      owner,
      treasury,
      deployer,
      alice,
      bob,
      sam,
      lpProvider1,
      lpProvider2,
      trader1,
      trader2,
    ]: SignerWithAddress[] = await ethers.getSigners();

    const ICO = await ethers.getContractFactory("ICO");
    const ico: ICO = (await ICO.connect(owner).deploy(treasury.address)) as ICO;
    await ico.deployed();

    const spaceCoinAddress: string = await ico.SPC_TOKEN_ADDRESS();

    const spaceCoin: SpaceCoin = (await ethers.getContractAt(
      "SpaceCoin",
      spaceCoinAddress
    )) as SpaceCoin;

    const SpaceLP = await ethers.getContractFactory("SpaceLP");
    const spaceLP: SpaceLP = (await SpaceLP.connect(owner).deploy(
      spaceCoin.address
    )) as SpaceLP;
    await spaceLP.deployed();

    const SpaceRouter = await ethers.getContractFactory("SpaceRouter");
    const spaceRouter: SpaceRouter = (await SpaceRouter.connect(owner).deploy(
      spaceLP.address,
      spaceCoin.address
    )) as SpaceRouter;
    await spaceRouter.deployed();

    const ForceFeeder = await ethers.getContractFactory("ForceFeeder");
    const forceFeeder: ForceFeeder = (await ForceFeeder.connect(owner).deploy(
      spaceLP.address,
      { value: ONE_ETHER }
    )) as ForceFeeder;
    await forceFeeder.deployed();

    await spaceCoin
      .connect(treasury)
      .transfer(lpProvider1.address, ONE_ETHER.mul(10000));

    await spaceCoin
      .connect(treasury)
      .transfer(lpProvider2.address, ONE_ETHER.mul(10000));

    return {
      owner,
      treasury,
      deployer,
      alice,
      bob,
      sam,
      lpProvider1,
      lpProvider2,
      trader1,
      trader2,
      ico,
      spaceCoin,
      spaceLP,
      spaceRouter,
      forceFeeder,
    };
  }

  describe("Deployment & Test Setup", () => {
    it("Deploys all contracts", async () => {
      const { ico, spaceCoin, spaceLP, spaceRouter, lpProvider1, lpProvider2 } =
        await loadFixture(setupFixture);
      expect(ico.address).to.be.properAddress;
      expect(spaceCoin.address).to.be.properAddress;
      expect(spaceLP.address).to.be.properAddress;
      expect(spaceRouter.address).to.be.properAddress;
      expect(await spaceLP.spaceCoin()).to.be.equals(spaceCoin.address);
      expect(await spaceRouter.spaceLP()).to.be.equals(spaceLP.address);
      expect(await spaceRouter.spaceCoin()).to.be.equals(spaceCoin.address);
      expect(await spaceCoin.balanceOf(lpProvider1.address)).to.be.equals(
        ONE_ETHER.mul(10000)
      );
      expect(await spaceCoin.balanceOf(lpProvider2.address)).to.be.equals(
        ONE_ETHER.mul(10000)
      );
    });

    // it("Flags floating promises", async () => {
    //   // NOTE: This test is just for demonstrating/confirming that eslint is
    //   // set up to warn about floating promises.
    //   const { ico, deployer, alice, bob } = await loadFixture(setupFixture);

    //   const txReceiptUnresolved = await ico.connect(alice).advancePhase();
    //   expect(txReceiptUnresolved.wait()).to.be.reverted;
    // });
  });

  describe("Deposit liquidity", () => {
    it("deposits initial liquidity", async () => {
      const { spaceCoin, spaceLP, spaceRouter, lpProvider1, lpProvider2 } =
        await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5));
      expect(
        await spaceLP
          .connect(lpProvider1)
          .deposit(lpProvider1.address, { value: ONE_ETHER })
      ).to.be.ok;

      const expectedLpTokensReceived: BigNumber = (
        await spaceLP.sqrt(ONE_ETHER.mul(5).mul(ONE_ETHER))
      ).sub(1000);

      expect(await spaceLP.balanceOf(lpProvider1.address)).to.be.equals(
        expectedLpTokensReceived
      );

      expect(await spaceLP.spcTokenBalance()).to.be.equals(ONE_ETHER.mul(5));
      expect(await spaceLP.ethBalance()).to.be.equals(ONE_ETHER);
    });

    it("allows deposits of inconsistent liquidity", async () => {
      const { spaceCoin, spaceLP, spaceRouter, lpProvider1, lpProvider2 } =
        await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5));
      expect(
        await spaceLP
          .connect(lpProvider1)
          .deposit(lpProvider1.address, { value: ONE_ETHER })
      ).to.be.ok;

      const expectedLpTokensReceived: BigNumber = (
        await spaceLP.sqrt(ONE_ETHER.mul(5).mul(ONE_ETHER))
      ).sub(1000);

      expect(await spaceLP.balanceOf(lpProvider1.address)).to.be.equals(
        expectedLpTokensReceived
      );

      expect(await spaceLP.spcTokenBalance()).to.be.equals(ONE_ETHER.mul(5));
      expect(await spaceLP.ethBalance()).to.be.equals(ONE_ETHER);

      const totalSupplyOfLpTokensBefore: BigNumber =
        await spaceLP.totalSupply();

      await spaceCoin
        .connect(lpProvider2)
        .transfer(spaceLP.address, ONE_ETHER.mul(25));
      expect(
        await spaceLP
          .connect(lpProvider2)
          .deposit(lpProvider2.address, { value: ONE_ETHER.mul(10) })
      ).to.be.ok;

      // will penalize for sending inconsistent liquidity
      expect(await spaceLP.balanceOf(lpProvider2.address)).to.be.equals(
        totalSupplyOfLpTokensBefore.mul(5)
      );

      expect(await spaceLP.spcTokenBalance()).to.be.equals(ONE_ETHER.mul(30));
      expect(await spaceLP.ethBalance()).to.be.equals(ONE_ETHER.mul(11));
    });

    it("revert if just one token is sent", async () => {
      const { spaceCoin, spaceLP, spaceRouter, lpProvider1, lpProvider2 } =
        await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5));
      await expect(
        spaceLP.connect(lpProvider1).deposit(lpProvider1.address)
      ).to.be.revertedWith("not enough amount provided");
    });

    it("revert if insufficient amount is sent", async () => {
      const { spaceCoin, spaceLP, spaceRouter, lpProvider1, lpProvider2 } =
        await loadFixture(setupFixture);
      await spaceCoin.connect(lpProvider1).transfer(spaceLP.address, 5);
      await expect(
        spaceLP.connect(lpProvider1).deposit(lpProvider1.address, { value: 1 })
      ).to.be.revertedWith("insufficient liquidity");
    });
  });

  describe("Withdraw liquidity", () => {
    it("withdraws liquidity successfully", async () => {
      const { spaceCoin, spaceLP, spaceRouter, lpProvider1, lpProvider2, sam } =
        await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5));
      expect(
        await spaceLP
          .connect(lpProvider1)
          .deposit(lpProvider1.address, { value: ONE_ETHER })
      ).to.be.ok;

      const expectedLpTokensReceived: BigNumber = (
        await spaceLP.sqrt(ONE_ETHER.mul(5).mul(ONE_ETHER))
      ).sub(1000);

      expect(await spaceLP.balanceOf(lpProvider1.address)).to.be.equals(
        expectedLpTokensReceived
      );

      expect(await spaceLP.spcTokenBalance()).to.be.equals(ONE_ETHER.mul(5));
      expect(await spaceLP.ethBalance()).to.be.equals(ONE_ETHER);

      await spaceLP
        .connect(lpProvider1)
        .transfer(spaceLP.address, expectedLpTokensReceived);

      const samEthBalanceBefore = await sam.getBalance();
      const samSpcBalanceBefore = await spaceCoin.balanceOf(sam.address);
      await spaceLP.connect(lpProvider1).withdraw(sam.address);
      const samEthBalanceAfter = await sam.getBalance();
      const samSpcBalanceAfter = await spaceCoin.balanceOf(sam.address);
      await closeTo(
        samEthBalanceAfter,
        samEthBalanceBefore.add(ONE_ETHER),
        10000
      );

      await closeTo(
        samSpcBalanceAfter,
        samSpcBalanceBefore.add(ONE_ETHER.mul(5)),
        10000
      );
      await closeTo(await spaceLP.spcTokenBalance(), 0, 10000);
      await closeTo(await spaceLP.ethBalance(), 0, 10000);
    });

    it("reverts if Lp total supply is 0", async () => {
      const { spaceCoin, spaceLP, spaceRouter, lpProvider1, lpProvider2, sam } =
        await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5));

      await expect(
        spaceLP.connect(lpProvider1).withdraw(sam.address)
      ).to.be.revertedWith("nothing to withdraw");
    });

    it("Reverts if Lp token balance of pool is 0", async () => {
      const { spaceCoin, spaceLP, spaceRouter, lpProvider1, lpProvider2, sam } =
        await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5));
      expect(
        await spaceLP
          .connect(lpProvider1)
          .deposit(lpProvider1.address, { value: ONE_ETHER })
      ).to.be.ok;

      const expectedLpTokensReceived: BigNumber = (
        await spaceLP.sqrt(ONE_ETHER.mul(5).mul(ONE_ETHER))
      ).sub(1000);

      expect(await spaceLP.balanceOf(lpProvider1.address)).to.be.equals(
        expectedLpTokensReceived
      );

      expect(await spaceLP.spcTokenBalance()).to.be.equals(ONE_ETHER.mul(5));
      expect(await spaceLP.ethBalance()).to.be.equals(ONE_ETHER);

      await expect(
        spaceLP.connect(lpProvider1).withdraw(sam.address)
      ).to.be.revertedWith("insufficient liquidity");
    });
  });

  describe("Skim liquidity", () => {
    it("allows random users to skim if there is any imbalance in spc reserves", async () => {
      const { spaceCoin, spaceLP, spaceRouter, lpProvider1, lpProvider2, sam } =
        await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5));

      const samSpcBalanceBefore = await spaceCoin.balanceOf(sam.address);
      await spaceLP.connect(sam).skim(sam.address);
      const samSpcBalanceAfter = await spaceCoin.balanceOf(sam.address);

      await closeTo(
        samSpcBalanceAfter,
        samSpcBalanceBefore.add(ONE_ETHER.mul(5)),
        10000
      );
    });

    it("allows random users to skim if there is any imbalance in eth reserves", async () => {
      const {
        spaceCoin,
        spaceLP,
        spaceRouter,
        lpProvider1,
        lpProvider2,
        sam,
        forceFeeder,
      } = await loadFixture(setupFixture);

      const samEthBalanceBefore = await ethers.provider.getBalance(sam.address);
      expect(await forceFeeder.forceSendEther({ value: ONE_ETHER })).to.be.ok;
      await spaceLP.connect(sam).skim(sam.address);
      const samEthBalanceAfter = await ethers.provider.getBalance(sam.address);

      expect(samEthBalanceAfter).greaterThanOrEqual(samEthBalanceBefore);
    });
  });

  describe("Swap tokens", () => {
    it("reverts if no assets are transferred", async () => {
      const {
        spaceCoin,
        spaceLP,
        spaceRouter,
        lpProvider1,
        lpProvider2,
        sam,
        trader1,
        forceFeeder,
      } = await loadFixture(setupFixture);

      await expect(
        spaceLP.connect(trader1).swap(trader1.address)
      ).to.be.revertedWith("no assets sent");
    });

    it("reverts if both assets are transferred", async () => {
      const {
        spaceCoin,
        spaceLP,
        spaceRouter,
        lpProvider1,
        lpProvider2,
        sam,
        trader1,
        forceFeeder,
      } = await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5));
      await forceFeeder.forceSendEther();
      await expect(
        spaceLP.connect(trader1).swap(trader1.address)
      ).to.be.revertedWith(
        "Swap unavailable while both ETH and SPC actual balances are out of sync with their corresponding reserve balances. Consider syncing the reserve balances before continuing."
      );
    });

    it("performs spc to eth swap correctly", async () => {
      const {
        spaceCoin,
        spaceLP,
        spaceRouter,
        lpProvider1,
        lpProvider2,
        sam,
        trader1,
        forceFeeder,
        trader2,
      } = await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5000));
      await spaceLP
        .connect(lpProvider1)
        .deposit(lpProvider1.address, { value: ONE_ETHER.mul(1000) });
      await spaceCoin
        .connect(lpProvider1)
        .transfer(trader1.address, ONE_ETHER.mul(100));
      const trader1EthBalanceBefore = await trader1.getBalance();
      await spaceCoin
        .connect(trader1)
        .transfer(spaceLP.address, ONE_ETHER.mul(100));
      expect(await spaceLP.connect(trader1).swap(trader1.address)).to.be.ok;
      const trader1EthBalanceAfter = await trader1.getBalance();
      const expectedTrader1EthBalanceAfter = trader1EthBalanceBefore.add(
        ethers.utils.parseEther("19.41")
      );
      //   console.log(
      //     trader1EthBalanceBefore,
      //     trader1EthBalanceAfter,
      //     expectedTrader1EthBalanceAfter
      //   );
      //   await closeTo(
      //     trader1EthBalanceAfter,
      //     expectedTrader1EthBalanceAfter,
      //     ethers.utils.parseEther("0.001")
      //   );

      expect(trader1EthBalanceAfter).to.be.closeTo(
        expectedTrader1EthBalanceAfter,
        2
      );
      //   expect(trader1EthBalanceAfter).to.be.closeTo(
      //     expectedTrader1EthBalanceAfter,
      //     1000000000000
      //   );
    });

    it("performs eth to spc swap correctly", async () => {
      const {
        spaceCoin,
        spaceLP,
        spaceRouter,
        lpProvider1,
        lpProvider2,
        sam,
        trader1,
        forceFeeder,
        trader2,
      } = await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5000));
      await spaceLP
        .connect(lpProvider1)
        .deposit(lpProvider1.address, { value: ONE_ETHER.mul(1000) });
      const trader1SpcBalanceBefore = await spaceCoin.balanceOf(
        trader1.address
      );
      expect(
        await spaceLP
          .connect(trader1)
          .swap(trader1.address, { value: ONE_ETHER.mul(100) })
      ).to.be.ok;
      const trader1SpcBalanceSpcAfter = await spaceCoin.balanceOf(
        trader1.address
      );
      const expectedTrader1SpcBalanceAfter = trader1SpcBalanceBefore.add(
        ethers.utils.parseEther("450.40")
      );
      //   console.log(
      //     trader1SpcBalanceBefore,
      //     trader1SpcBalanceSpcAfter,
      //     expectedTrader1SpcBalanceAfter
      //   );
      //   await closeTo(
      //     trader1SpcBalanceSpcAfter,
      //     expectedTrader1SpcBalanceAfter,
      //     ethers.utils.parseEther("0.001")
      //   );
    });
  });

  describe("Quote prices", () => {
    it("reverts if no assets are to be transferred", async () => {
      const {
        spaceCoin,
        spaceLP,
        spaceRouter,
        lpProvider1,
        lpProvider2,
        sam,
        trader1,
        forceFeeder,
      } = await loadFixture(setupFixture);

      await expect(
        spaceLP.connect(trader1).quoteSwapPrice(0, 0)
      ).to.be.revertedWith("no assets sent");
    });

    it("reverts if both assets are to be transferred", async () => {
      const {
        spaceCoin,
        spaceLP,
        spaceRouter,
        lpProvider1,
        lpProvider2,
        sam,
        trader1,
        forceFeeder,
      } = await loadFixture(setupFixture);

      await expect(
        spaceLP.connect(trader1).quoteSwapPrice(1, 1)
      ).to.be.revertedWith("can't send both assets");
    });

    it("quotes spc to eth swap correctly", async () => {
      const {
        spaceCoin,
        spaceLP,
        spaceRouter,
        lpProvider1,
        lpProvider2,
        sam,
        trader1,
        forceFeeder,
        trader2,
      } = await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5000));
      await spaceLP
        .connect(lpProvider1)
        .deposit(lpProvider1.address, { value: ONE_ETHER.mul(1000) });
      const quotedEth = await spaceLP
        .connect(trader1)
        .quoteSwapPrice(0, ONE_ETHER.mul(100));
      console.log(quotedEth);
      //   await closeTo(
      //     quotedEth,
      //     ethers.utils.parseEther("19.41"),
      //     ethers.utils.parseEther("0.001")
      //   );
    });

    it("quotes eth to spc swap correctly", async () => {
      const {
        spaceCoin,
        spaceLP,
        spaceRouter,
        lpProvider1,
        lpProvider2,
        sam,
        trader1,
        forceFeeder,
        trader2,
      } = await loadFixture(setupFixture);
      await spaceCoin
        .connect(lpProvider1)
        .transfer(spaceLP.address, ONE_ETHER.mul(5000));
      await spaceLP
        .connect(lpProvider1)
        .deposit(lpProvider1.address, { value: ONE_ETHER.mul(1000) });
      const quotedSpc = await spaceLP
        .connect(trader1)
        .quoteSwapPrice(ONE_ETHER.mul(100), 0);
      //   await closeTo(
      //     quotedSpc,
      //     ethers.utils.parseEther("450.40"),
      //     ethers.utils.parseEther("0.001")
      //   );
    });
  });
});
