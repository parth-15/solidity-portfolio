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

const ICO_PHASE: any = {
  SEED: 0,
  GENERAL: 1,
  OPEN: 2,
};

describe("SpaceRouter", () => {
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

  describe("Deployment and test setup", () => {
    it("deploys all contract successfully", async () => {
      const {
        owner,
        treasury,
        alice,
        lpProvider1,
        lpProvider2,
        trader1,
        ico,
        spaceCoin,
        spaceLP,
        spaceRouter,
      } = await loadFixture(setupFixture);

      expect(await spaceRouter.spaceCoin()).to.be.equals(spaceCoin.address);
      expect(await spaceRouter.spaceLP()).to.be.equals(spaceLP.address);
    });
  });

  describe("Swap ETH for Spc", () => {
    it("Swaps ETH for SPC correctly when transfer tax is not enabled", async () => {
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
        await spaceRouter
          .connect(trader1)
          .swapETHForSPC(ethers.utils.parseEther("450.30"), {
            value: ONE_ETHER.mul(100),
          })
      ).to.be.ok;
      const trader1SpcBalanceSpcAfter = await spaceCoin.balanceOf(
        trader1.address
      );
      const expectedTrader1SpcBalanceAfter = trader1SpcBalanceBefore.add(
        ethers.utils.parseEther("450.40")
      );
      expect(
        expectedTrader1SpcBalanceAfter.sub(trader1SpcBalanceSpcAfter)
      ).lessThanOrEqual(ethers.utils.parseEther("0.00001"));
    });

    it("Reverts Swaps of ETH for SPC due to slippage when transfer tax is not enabled", async () => {
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
      await expect(
        spaceRouter
          .connect(trader1)
          .swapETHForSPC(ethers.utils.parseEther("450.50"), {
            value: ONE_ETHER.mul(100),
          })
      ).to.be.revertedWith("invalid amount to be received");
    });

    it("Swaps ETH for SPC correctly when transfer tax is enabled", async () => {
      const {
        spaceCoin,
        spaceLP,
        spaceRouter,
        lpProvider1,
        lpProvider2,
        owner,
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
      await spaceCoin.connect(owner).setTransferTax(true);
      const trader1SpcBalanceBefore = await spaceCoin.balanceOf(
        trader1.address
      );
      expect(
        await spaceRouter
          .connect(trader1)
          .swapETHForSPC(ethers.utils.parseEther("441"), {
            value: ONE_ETHER.mul(100),
          })
      ).to.be.ok;
      const trader1SpcBalanceSpcAfter = await spaceCoin.balanceOf(
        trader1.address
      );
      const expectedTrader1SpcBalanceAfter = trader1SpcBalanceBefore.add(
        ethers.utils.parseEther("441")
      );
      expect(
        expectedTrader1SpcBalanceAfter.sub(trader1SpcBalanceSpcAfter)
      ).lessThanOrEqual(ethers.utils.parseEther("0.00001"));
    });

    it("Reverts Swap of  ETH for SPC when transfer tax is enabled", async () => {
      const {
        spaceCoin,
        spaceLP,
        spaceRouter,
        lpProvider1,
        lpProvider2,
        owner,
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
      await spaceCoin.connect(owner).setTransferTax(true);
      await expect(
        spaceRouter
          .connect(trader1)
          .swapETHForSPC(ethers.utils.parseEther("441.80"), {
            value: ONE_ETHER.mul(100),
          })
      ).to.be.revertedWith("invalid amount to be received");
    });
  });

  describe("Swap Spc for ETH", () => {
    it("performs spc to eth swap correctly when transfer tax is not enabled", async () => {
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
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(100));
      expect(
        await spaceRouter
          .connect(trader1)
          .swapSPCForETH(ONE_ETHER.mul(100), ethers.utils.parseEther("19.41"))
      ).to.be.ok;
      const trader1EthBalanceAfter = await trader1.getBalance();
      const expectedTrader1EthBalanceAfter = trader1EthBalanceBefore.add(
        ethers.utils.parseEther("19.41")
      );
      expect(
        expectedTrader1EthBalanceAfter.sub(trader1EthBalanceAfter)
      ).lessThanOrEqual(ethers.utils.parseEther("0.0000000001"));
    });

    it("reverts spc to eth swap when transfer tax is not enabled", async () => {
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
      await spaceCoin
        .connect(trader1)
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(100));
      await expect(
        spaceRouter
          .connect(trader1)
          .swapSPCForETH(ONE_ETHER.mul(100), ethers.utils.parseEther("19.42"))
      ).to.be.revertedWith("invalid amount to be received");
    });

    it("reverts spc to eth swap when allowance not provided and transfer tax is not enabled", async () => {
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
      await expect(
        spaceRouter
          .connect(trader1)
          .swapSPCForETH(ONE_ETHER.mul(100), ethers.utils.parseEther("19.41"))
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("performs spc to eth swap correctly when transfer tax is enabled", async () => {
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
      await spaceCoin.setTransferTax(true);
      const trader1EthBalanceBefore = await trader1.getBalance();
      await spaceCoin
        .connect(trader1)
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(100));
      expect(
        await spaceRouter
          .connect(trader1)
          .swapSPCForETH(ONE_ETHER.mul(100), ethers.utils.parseEther("19.03"))
      ).to.be.ok;
      const trader1EthBalanceAfter = await trader1.getBalance();
      const expectedTrader1EthBalanceAfter = trader1EthBalanceBefore.add(
        ethers.utils.parseEther("19.03")
      );
      expect(
        expectedTrader1EthBalanceAfter.sub(trader1EthBalanceAfter)
      ).lessThanOrEqual(ethers.utils.parseEther("0.0000000001"));
    });

    it("reverts spc to eth swap when transfer tax is enabled", async () => {
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
      await spaceCoin.setTransferTax(true);
      await spaceCoin
        .connect(trader1)
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(100));
      await expect(
        spaceRouter
          .connect(trader1)
          .swapSPCForETH(ONE_ETHER.mul(100), ethers.utils.parseEther("19.04"))
      ).to.be.revertedWith("invalid amount to be received");
    });

    it("reverts spc to eth swap when allowance not provided and transfer tax is not enabled", async () => {
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
      await expect(
        spaceRouter
          .connect(trader1)
          .swapSPCForETH(ONE_ETHER.mul(100), ethers.utils.parseEther("19.41"))
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("Remove liquidity", () => {
    it("Removes liquidity successfully when tax is not enabled", async () => {
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

      const ethBalanceBefore = await lpProvider1.getBalance();
      const spcBalanceBefore = await spaceCoin.balanceOf(lpProvider1.address);

      await spaceLP
        .connect(lpProvider1)
        .increaseAllowance(
          spaceRouter.address,
          await spaceLP.balanceOf(lpProvider1.address)
        );

      await spaceRouter
        .connect(lpProvider1)
        .removeLiquidity(await spaceLP.balanceOf(lpProvider1.address));

      const ethBalanceAfter = await lpProvider1.getBalance();
      const spcBalanceAfter = await spaceCoin.balanceOf(lpProvider1.address);
      const lpBalanceAfter = await spaceLP.balanceOf(lpProvider1.address);

      expect(lpBalanceAfter).to.be.equal(0);
      expect(ONE_ETHER.mul(1000).sub(ethBalanceAfter)).lessThanOrEqual(
        ethers.utils.parseEther("0.0000000001")
      );
      expect(ONE_ETHER.mul(5000).sub(spcBalanceAfter)).lessThanOrEqual(
        ethers.utils.parseEther("0.0000000001")
      );
    });

    it("Reverts while removing liquidity when tax is not enabled and amount is more than balance", async () => {
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

      const ethBalanceBefore = await lpProvider1.getBalance();
      const spcBalanceBefore = await spaceCoin.balanceOf(lpProvider1.address);

      await spaceLP
        .connect(lpProvider1)
        .increaseAllowance(
          spaceRouter.address,
          await spaceLP.balanceOf(lpProvider1.address)
        );

      await expect(
        spaceRouter
          .connect(lpProvider1)
          .removeLiquidity(
            await (await spaceLP.balanceOf(lpProvider1.address)).add(5)
          )
      ).to.be.revertedWith("not enough lp tokens");
    });
  });

  describe("Add liquidity", () => {
    it("add initial liquidity", async () => {
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

      const lpTokensBefore = await spaceLP.balanceOf(lpProvider1.address);

      await spaceCoin
        .connect(lpProvider1)
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(5));

      await spaceRouter
        .connect(lpProvider1)
        .addLiquidity(ONE_ETHER.mul(5), { value: ONE_ETHER });

      const lpTokensAfter = await spaceLP.balanceOf(lpProvider1.address);

      expect(lpTokensBefore).to.be.equal(0);
      expect(lpTokensAfter).to.be.equal(
        (await spaceLP.sqrt(ONE_ETHER.mul(5).mul(ONE_ETHER))).sub(1000)
      );
    });

    it("add second liquidity", async () => {
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

      const lpTokensBefore = await spaceLP.balanceOf(lpProvider1.address);

      await spaceCoin
        .connect(lpProvider1)
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(5));

      await spaceCoin
        .connect(lpProvider2)
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(20));

      await spaceRouter
        .connect(lpProvider1)
        .addLiquidity(ONE_ETHER.mul(5), { value: ONE_ETHER });

      const lpTokensAfterFirstLiquidity = await spaceLP.balanceOf(
        lpProvider1.address
      );

      expect(lpTokensBefore).to.be.equal(0);
      expect(lpTokensAfterFirstLiquidity).to.be.equal(
        (await spaceLP.sqrt(ONE_ETHER.mul(5).mul(ONE_ETHER))).sub(1000)
      );

      await spaceRouter
        .connect(lpProvider2)
        .addLiquidity(ONE_ETHER.mul(20), { value: ONE_ETHER.mul(4) });

      const lpTokensOfLpProvider2 = await spaceLP.balanceOf(
        lpProvider2.address
      );

      expect(lpTokensOfLpProvider2).to.be.equal(
        (await spaceLP.sqrt(ONE_ETHER.mul(5).mul(ONE_ETHER))).mul(4)
      );
    });

    it("add second liquidity reverts", async () => {
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

      const lpTokensBefore = await spaceLP.balanceOf(lpProvider1.address);

      await spaceCoin
        .connect(lpProvider1)
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(5));

      await spaceCoin
        .connect(lpProvider2)
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(20));

      await spaceRouter
        .connect(lpProvider1)
        .addLiquidity(ONE_ETHER.mul(5), { value: ONE_ETHER });

      const lpTokensAfterFirstLiquidity = await spaceLP.balanceOf(
        lpProvider1.address
      );

      expect(lpTokensBefore).to.be.equal(0);
      expect(lpTokensAfterFirstLiquidity).to.be.equal(
        (await spaceLP.sqrt(ONE_ETHER.mul(5).mul(ONE_ETHER))).sub(1000)
      );

      await expect(
        spaceRouter
          .connect(lpProvider2)
          .addLiquidity(ONE_ETHER.mul(20), { value: ONE_ETHER.mul(3) })
      ).to.be.revertedWith("less eth sent");

      const lpTokensOfLpProvider2 = await spaceLP.balanceOf(
        lpProvider2.address
      );

      expect(lpTokensOfLpProvider2).to.be.equal(0);
    });

    it("add second liquidity sends additional ether", async () => {
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

      const lpTokensBefore = await spaceLP.balanceOf(lpProvider1.address);

      await spaceCoin
        .connect(lpProvider1)
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(5));

      await spaceCoin
        .connect(lpProvider2)
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(20));

      await spaceRouter
        .connect(lpProvider1)
        .addLiquidity(ONE_ETHER.mul(5), { value: ONE_ETHER });

      const lpTokensAfterFirstLiquidity = await spaceLP.balanceOf(
        lpProvider1.address
      );

      expect(lpTokensBefore).to.be.equal(0);
      expect(lpTokensAfterFirstLiquidity).to.be.equal(
        (await spaceLP.sqrt(ONE_ETHER.mul(5).mul(ONE_ETHER))).sub(1000)
      );
      const ethBalanceOflpProvider2Before = await lpProvider2.getBalance();
      expect(
        await spaceRouter
          .connect(lpProvider2)
          .addLiquidity(ONE_ETHER.mul(20), { value: ONE_ETHER.mul(5) })
      ).to.be.ok;

      const lpTokensOfLpProvider2 = await spaceLP.balanceOf(
        lpProvider2.address
      );

      const ethBalanceOflpProvider2After = await lpProvider2.getBalance();

      expect(lpTokensOfLpProvider2).to.be.equal(
        (await spaceLP.sqrt(ONE_ETHER.mul(5).mul(ONE_ETHER))).mul(4)
      );

      expect(
        ethBalanceOflpProvider2Before.sub(ethBalanceOflpProvider2After)
      ).lessThanOrEqual(ethers.utils.parseEther("4.001"));
    });
  });

  describe("end to end process test", () => {
    it("raise funds, withdraw, add liquidity through router", async () => {
      const {
        ico,
        alice,
        bob,
        sam,
        owner,
        spaceLP,
        spaceRouter,
        treasury,
        lpProvider1,
        spaceCoin,
      } = await loadFixture(setupFixture);

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

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(
        await ico.connect(contributor).contribute({ value: ONE_ETHER.mul(200) })
      ).to.be.ok;

      expect(await ethers.provider.getBalance(ico.address)).to.be.equal(
        ONE_ETHER.mul(30_000)
      );

      await expect(
        ico.connect(owner).withdraw(treasury.address)
      ).to.be.revertedWith("only treasury allowed");

      const ethBalanceTreasuryBefore = await treasury.getBalance();

      expect(await ico.connect(treasury).withdraw(treasury.address)).to.be.ok;

      const ethBalanceTreasuryAfter = await treasury.getBalance();
      expect(
        ethBalanceTreasuryAfter.sub(ethBalanceTreasuryBefore)
      ).greaterThanOrEqual(ethers.utils.parseEther("29999.999"));

      await spaceCoin
        .connect(treasury)
        .increaseAllowance(spaceRouter.address, ONE_ETHER.mul(150_000));

      await spaceRouter
        .connect(treasury)
        .addLiquidity(ONE_ETHER.mul(150_000), { value: ONE_ETHER.mul(30000) });

      expect(await spaceLP.balanceOf(treasury.address)).to.be.equal(
        (
          await spaceLP.sqrt(ONE_ETHER.mul(150_000).mul(ONE_ETHER).mul(30_000))
        ).sub(1000)
      );
    });

    it("raise funds, withdraw, add liquidity through pool", async () => {
      const {
        ico,
        alice,
        bob,
        sam,
        owner,
        spaceLP,
        spaceRouter,
        treasury,
        lpProvider1,
        spaceCoin,
      } = await loadFixture(setupFixture);

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

      await ico.connect(owner).advancePhase(ICO_PHASE.OPEN);

      expect(
        await ico.connect(contributor).contribute({ value: ONE_ETHER.mul(200) })
      ).to.be.ok;

      expect(await ethers.provider.getBalance(ico.address)).to.be.equal(
        ONE_ETHER.mul(30_000)
      );

      await expect(
        ico.connect(owner).withdraw(treasury.address)
      ).to.be.revertedWith("only treasury allowed");

      const ethBalanceTreasuryBefore = await treasury.getBalance();

      expect(await ico.connect(treasury).withdraw(treasury.address)).to.be.ok;

      const ethBalanceTreasuryAfter = await treasury.getBalance();
      expect(
        ethBalanceTreasuryAfter.sub(ethBalanceTreasuryBefore)
      ).greaterThanOrEqual(ethers.utils.parseEther("29999.999"));

      await spaceCoin
        .connect(treasury)
        .transfer(spaceLP.address, ONE_ETHER.mul(150_000));

      await spaceLP
        .connect(treasury)
        .deposit(treasury.address, { value: ONE_ETHER.mul(30000) });

      expect(await spaceLP.balanceOf(treasury.address)).to.be.equal(
        (
          await spaceLP.sqrt(ONE_ETHER.mul(150_000).mul(ONE_ETHER).mul(30_000))
        ).sub(1000)
      );
    });
  });
});
