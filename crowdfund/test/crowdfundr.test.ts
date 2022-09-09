import { utils, BigNumber, BigNumberish, ContractTransaction } from "ethers";
/* eslint-disable no-unused-expressions,camelcase */
// ----------------------------------------------------------------------------
// REQUIRED: Instructions
// ----------------------------------------------------------------------------
/*
  For this first project, we've provided a significant amount of scaffolding
  in your test suite. We've done this to:

    1. Set expectations, by example, of where the bar for testing is.
    3. Reduce the amount of time consumed this week by "getting started friction".

  Please note that:

    - We will not be so generous on future projects!
    - The tests provided are about ~90% complete.
    - IMPORTANT:
      - We've intentionally left out some tests that would reveal potential
        vulnerabilities you'll need to identify, solve for, AND TEST FOR!

      - Failing to address these vulnerabilities will leave your contracts
        exposed to hacks, and will certainly result in extra points being
        added to your micro-audit report! (Extra points are _bad_.)

  Your job (in this file):

    - DO NOT delete or change the test names for the tests provided
    - DO complete the testing logic inside each tests' callback function
    - DO add additional tests to test how you're securing your smart contracts
         against potential vulnerabilties you identify as you work through the
         project.

    - You will also find several places where "FILL_ME_IN" has been left for
      you. In those places, delete the "FILL_ME_IN" text, and replace with
      whatever is appropriate.
*/
// ----------------------------------------------------------------------------

import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  Project,
  ProjectFactory,
  Project__factory,
  ProjectFactory__factory,
  Attack,
  Attack__factory,
} from "../typechain-types";

// ----------------------------------------------------------------------------
// OPTIONAL: Constants and Helper Functions
// ----------------------------------------------------------------------------
// We've put these here for your convenience, and to make you aware these built-in
// Hardhat functions exist. Feel free to use them if they are helpful!
const SECONDS_IN_DAY: number = 60 * 60 * 24;
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");
const AWESOME_NFT_NAME: string = "AWESOMENFT";
const AWESOME_NFT_SYMBOL: string = "AWW";

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

const getProjectContractFromTransaction = async (
  unresolvedTx: ContractTransaction
) => {
  const resolvedTx = await unresolvedTx.wait();
  const projectAddress: string = resolvedTx.events![0].args![1];
  return ethers.getContractAt("Project", projectAddress);
};

// ----------------------------------------------------------------------------

describe("Crowdfundr", () => {
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let sam: SignerWithAddress;

  let ProjectFactory: ProjectFactory__factory;
  let projectFactory: ProjectFactory;
  let AttackFactory: Attack__factory;
  let attack: Attack;

  beforeEach(async () => {
    [deployer, alice, bob, sam] = await ethers.getSigners();

    // NOTE: You may need to pass arguments to the `deploy` function if your
    //       ProjectFactory contract's constructor has input parameters
    ProjectFactory = (await ethers.getContractFactory(
      "ProjectFactory"
    )) as ProjectFactory__factory;
    projectFactory = (await ProjectFactory.deploy()) as ProjectFactory;
    await projectFactory.deployed();

    AttackFactory = (await ethers.getContractFactory(
      "Attack"
    )) as Attack__factory;
    attack = (await AttackFactory.deploy()) as Attack;
    await attack.deployed();
  });

  describe("ProjectFactory: Additional Tests", () => {
    /*
      TODO: You may add additional tests here if you need to

      NOTE: If you wind up writing Solidity code to protect against a
            vulnerability that is not tested for below, you should add
            at least one test here.

      DO NOT: Delete or change the test names for the tests provided below
    */

    it("Does not create contract with creator as Zero address", async () => {
      let Project: Project__factory;
      Project = (await ethers.getContractFactory(
        "Project"
      )) as Project__factory;

      await expect(
        Project.deploy(
          "0x0000000000000000000000000000000000000000",
          ONE_ETHER,
          AWESOME_NFT_NAME,
          AWESOME_NFT_SYMBOL
        )
      ).to.be.revertedWith("Invalid address");
    });

    it("Does not allow to create a contract with funding goal of less than 0.01 ether", async () => {
      await expect(
        projectFactory
          .connect(alice)
          .create(
            ethers.utils.parseEther("0.001"),
            AWESOME_NFT_NAME,
            AWESOME_NFT_SYMBOL
          )
      ).to.be.revertedWith("Invalid amount");
    });
  });

  describe("ProjectFactory", () => {
    it("Deploys a contract", async () => {
      expect(projectFactory.address).to.be.string;
    });

    // NOTE: This test is just for demonstrating/confirming that eslint is set up to warn about floating promises.
    // If you do not see an error in the `it` test below you must enable ESLint in your editor. You are likely
    // missing important bugs in your tests and contracts without it.
    it("Flags floating promises", async () => {
      const txReceiptUnresolved = await projectFactory
        .connect(alice)
        .create(ONE_ETHER.mul(5), AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL);
      await expect(txReceiptUnresolved.wait()).to.be.ok;
    });

    it("Can register a single project", async () => {
      await expect(
        projectFactory
          .connect(alice)
          .create(ONE_ETHER.mul(5), AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL)
      ).to.be.ok;
    });

    it("Can register multiple projects", async () => {
      await expect(
        projectFactory
          .connect(alice)
          .create(ONE_ETHER.mul(5), AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL)
      ).to.be.ok;

      await expect(
        projectFactory
          .connect(bob)
          .create(ONE_ETHER.mul(3), AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL)
      ).to.be.ok;
    });

    it("Registers projects with the correct owner", async () => {
      const unresolvedTx = await projectFactory
        .connect(alice)
        .create(ONE_ETHER.mul(2), AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL);
      const project = await getProjectContractFromTransaction(unresolvedTx);
      expect(await project.CREATOR()).to.be.equal(alice.address);
    });

    it("Registers projects with a preset funding goal (in units of wei)", async () => {
      const unresolvedTx = await projectFactory
        .connect(alice)
        .create(ONE_ETHER, AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL);
      const project = await getProjectContractFromTransaction(unresolvedTx);
      expect(await project.AMOUNT_TO_RAISE()).to.be.equal(ONE_ETHER);
    });

    it('Emits a "ProjectCreated" event after registering a project', async () => {
      await expect(
        projectFactory
          .connect(alice)
          .create(ONE_ETHER, AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL)
      ).to.emit(projectFactory, "ProjectCreated");
    });

    it("Allows multiple contracts to accept ETH simultaneously", async () => {
      const unResolvedTx1 = await projectFactory
        .connect(alice)
        .create(ONE_ETHER.mul(5), AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL);

      const unResolvedTx2 = await projectFactory
        .connect(bob)
        .create(ONE_ETHER.mul(3), AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL);

      const project1 = await getProjectContractFromTransaction(unResolvedTx1);
      const project2 = await getProjectContractFromTransaction(unResolvedTx2);

      expect(
        await project1
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("6") })
      ).to.be.ok;
      expect(
        await project2
          .connect(bob)
          .contribute({ value: ethers.utils.parseEther("2") })
      ).to.be.ok;
    });

    describe("Project: Additional Tests", () => {
      /*
      TODO: You may add additional tests here if you need to

      NOTE: If you wind up protecting against a vulnerability that is not
            tested for below, you should add at least one test here.

      DO NOT: Delete or change the test names for the tests provided below
    */

      let projectAddress: string;
      let project: Project;

      beforeEach(async () => {
        // TODO: Your ProjectFactory contract will need a `create` method, to
        //       create new Projects
        const txReceiptUnresolved = await projectFactory
          .connect(deployer)
          .create(ONE_ETHER.mul(5), AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL);
        const txReceipt = await txReceiptUnresolved.wait();

        projectAddress = txReceipt.events![0].args![1];
        project = (await ethers.getContractAt(
          "Project",
          projectAddress
        )) as Project;
      });

      it("Can't mint additional badges by reentrancy attack", async () => {
        await attack.setVictim(project.address, {
          value: ethers.utils.parseEther("5"),
        });
        await attack.attack(ethers.utils.parseEther("3"));
        expect(await project.badgesGiven(attack.address)).to.equal(4);
      });

      it("Can't contribute if goal is reached through reentrancy", async () => {
        await attack.setVictim(project.address, {
          value: ethers.utils.parseEther("10"),
        });
        await expect(
          attack.attack(ethers.utils.parseEther("5"))
        ).to.be.revertedWith("Project not active");
      });

      it("Receives correct amount of NFT for contribution after trading", async () => {
        await project
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("2.5") });
        expect(await project.balanceOf(alice.address)).to.be.equal(2);
        expect(await project.badgesGiven(alice.address)).to.be.equal(2);

        await project
          .connect(alice)
          .transferFrom(alice.address, bob.address, 1);

        await project
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("0.5") });

        expect(await project.balanceOf(alice.address)).to.be.equal(2);
        expect(await project.badgesGiven(alice.address)).to.be.equal(3);
      });

      it("Receives correct amount of refund for failed project after NFT trading", async () => {
        const initialBalanceOfAlice = await alice.getBalance();

        await project
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("2.5") });
        expect(await project.balanceOf(alice.address)).to.be.equal(2);
        expect(await project.badgesGiven(alice.address)).to.be.equal(2);

        await project
          .connect(alice)
          .transferFrom(alice.address, bob.address, 1);

        await project
          .connect(alice)
          .contribute({ value: ethers.utils.parseEther("0.5") });

        expect(await project.balanceOf(alice.address)).to.be.equal(2);
        expect(await project.badgesGiven(alice.address)).to.be.equal(3);

        await project.connect(deployer).cancelProject();

        await project.connect(alice).claimContributions();

        const finalBalanceOfAlice = await alice.getBalance();

        await closeTo(
          finalBalanceOfAlice,
          initialBalanceOfAlice,
          ethers.utils.parseEther("0.001")
        );
      });

      it("Can claim contributions if owner cancels the project", async () => {
        const initialAliceBalance = await alice.getBalance();
        const initialBobBalance = await bob.getBalance();
        await project.connect(alice).contribute({ value: ONE_ETHER });
        await project
          .connect(bob)
          .contribute({ value: ethers.utils.parseEther("2") });
        await project.connect(deployer).cancelProject();
        expect(await project.connect(alice).claimContributions()).to.be.ok;
        expect(await project.connect(bob).claimContributions()).to.be.ok;
        const finalAliceBalance = await alice.getBalance();
        const finalBobBalance = await bob.getBalance();

        await closeTo(
          initialAliceBalance,
          finalAliceBalance,
          ethers.utils.parseEther("0.001")
        );

        await closeTo(
          initialBobBalance,
          finalBobBalance,
          ethers.utils.parseEther("0.001")
        );
      });
    });

    describe("Project", () => {
      let projectAddress: string;
      let project: Project;

      beforeEach(async () => {
        // TODO: Your ProjectFactory contract will need a `create` method, to
        //       create new Projects
        const txReceiptUnresolved = await projectFactory
          .connect(deployer)
          .create(ONE_ETHER.mul(5), AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL);
        const txReceipt = await txReceiptUnresolved.wait();

        projectAddress = txReceipt.events![0].args![1];
        project = (await ethers.getContractAt(
          "Project",
          projectAddress
        )) as Project;
      });

      describe("Contributions", () => {
        describe("Contributors", () => {
          it("Allows the creator to contribute", async () => {
            const creator: string = await project.CREATOR();
            expect(creator).to.be.equal(deployer.address);
            expect(
              await project.connect(deployer).contribute({ value: ONE_ETHER })
            ).to.be.ok;
          });

          it("Allows any EOA to contribute", async () => {
            expect(
              await project.connect(alice).contribute({ value: ONE_ETHER })
            ).to.be.ok;
          });

          it("Allows an EOA to make many separate contributions", async () => {
            expect(
              await project.connect(alice).contribute({ value: ONE_ETHER })
            ).to.be.ok;
            expect(
              await project.connect(alice).contribute({ value: ONE_ETHER })
            ).to.be.ok;
            expect(
              await project.connect(alice).contribute({ value: ONE_ETHER })
            ).to.be.ok;
          });

          it('Emits a "ContributionReceived" event after a contribution is made', async () => {
            await expect(
              project.connect(alice).contribute({ value: ONE_ETHER })
            )
              .to.emit(project, "ContributionReceived")
              .withArgs(alice.address, ONE_ETHER);
          });
        });

        describe("Minimum ETH Per Contribution", () => {
          it("Reverts contributions below 0.01 ETH", async () => {
            await expect(
              project
                .connect(alice)
                .contribute({ value: ethers.utils.parseEther("0.001") })
            ).to.be.revertedWith("Min contribution is 0.01 ether");
          });

          it("Accepts contributions of exactly 0.01 ETH", async () => {
            await expect(
              project
                .connect(alice)
                .contribute({ value: ethers.utils.parseEther("0.01") })
            ).to.be.ok;
          });
        });

        describe("Final Contributions", () => {
          it("Allows the final contribution to exceed the project funding goal", async () => {
            // Note: After this contribution, the project is fully funded and should not
            //       accept any additional contributions. (See next test.)
            await expect(
              project
                .connect(alice)
                .contribute({ value: ethers.utils.parseEther("4") })
            ).to.be.ok;
            await expect(
              project
                .connect(bob)
                .contribute({ value: ethers.utils.parseEther("2") })
            ).to.be.ok;
          });

          it("Prevents additional contributions after a project is fully funded", async () => {
            await expect(
              project
                .connect(alice)
                .contribute({ value: ethers.utils.parseEther("4") })
            ).to.be.ok;
            await expect(
              project
                .connect(bob)
                .contribute({ value: ethers.utils.parseEther("2") })
            ).to.be.ok;
            await expect(
              project
                .connect(deployer)
                .contribute({ value: ethers.utils.parseEther("0.02") })
            ).to.be.revertedWith("Project not active");
          });

          it("Prevents additional contributions after 30 days have passed since Project instance deployment", async () => {
            await expect(
              project
                .connect(alice)
                .contribute({ value: ethers.utils.parseEther("4") })
            ).to.be.ok;
            await timeTravel(30 * 24 * 3600); // 30 days
            await expect(
              project
                .connect(alice)
                .contribute({ value: ethers.utils.parseEther("0.02") })
            ).to.be.revertedWith("Round ended");
          });
        });
      });

      describe("Withdrawals", () => {
        describe("Project Status: Active", () => {
          beforeEach(async () => {
            await project
              .connect(alice)
              .contribute({ value: ethers.utils.parseEther("0.02") });
          });

          it("Prevents the creator from withdrawing any funds", async () => {
            await expect(
              project
                .connect(deployer)
                .claimProjectFund(ethers.utils.parseEther("0.01"))
            ).to.be.revertedWith("Project not completed");
          });

          it("Prevents contributors from withdrawing any funds", async () => {
            await expect(
              project.connect(alice).claimContributions()
            ).to.be.revertedWith("Project active or completed");
          });

          it("Prevents non-contributors from withdrawing any funds", async () => {
            await expect(
              project.connect(bob).claimContributions()
            ).to.be.revertedWith("No contribution");
          });
        });

        describe("Project Status: Success", () => {
          beforeEach(async () => {
            await project
              .connect(deployer)
              .contribute({ value: ethers.utils.parseEther("1") });

            await project
              .connect(alice)
              .contribute({ value: ethers.utils.parseEther("3") });

            await project
              .connect(bob)
              .contribute({ value: ethers.utils.parseEther("2") });
          });

          it("Allows the creator to withdraw some of the contribution balance", async () => {
            expect(
              await project
                .connect(deployer)
                .claimProjectFund(ethers.utils.parseEther("2"))
            ).to.be.ok;
          });

          it("Allows the creator to withdraw the entire contribution balance", async () => {
            expect(
              await project
                .connect(deployer)
                .claimProjectFund(ethers.utils.parseEther("6"))
            ).to.be.ok;
          });

          it("Allows the creator to make multiple withdrawals", async () => {
            expect(
              await project
                .connect(deployer)
                .claimProjectFund(ethers.utils.parseEther("1"))
            ).to.be.ok;
            expect(
              await project
                .connect(deployer)
                .claimProjectFund(ethers.utils.parseEther("3"))
            ).to.be.ok;
          });

          it("Prevents the creator from withdrawing more than the contribution balance", async () => {
            expect(
              await project
                .connect(deployer)
                .claimProjectFund(ethers.utils.parseEther("1"))
            ).to.be.ok;
            await expect(
              project
                .connect(deployer)
                .claimProjectFund(ethers.utils.parseEther("6"))
            ).to.be.revertedWith("Invalid amount");
          });

          it('Emits a "CreatorWithdrawal" event after a withdrawal is made by the creator', async () => {
            await expect(
              project
                .connect(deployer)
                .claimProjectFund(ethers.utils.parseEther("1"))
            )
              .to.emit(project, "CreatorWithdrawal")
              .withArgs(ONE_ETHER);
          });

          it("Prevents contributors from withdrawing any funds", async () => {
            await expect(
              project.connect(alice).claimContributions()
            ).to.be.revertedWith("Project active or completed");
          });

          it("Prevents non-contributors from withdrawing any funds", async () => {
            await expect(
              project.connect(sam).claimContributions()
            ).to.be.revertedWith("No contribution");
          });
        });

        // Note: The terms "withdraw" and "refund" are distinct from one another.
        // Withdrawal = Creator extracts all funds raised from the contract.
        // Refund = Contributors extract the funds they personally contributed.
        describe("Project Status: Failure", () => {
          beforeEach(async () => {
            await project
              .connect(deployer)
              .contribute({ value: ethers.utils.parseEther("1") });
            await project
              .connect(alice)
              .contribute({ value: ethers.utils.parseEther("1") });
            await project
              .connect(bob)
              .contribute({ value: ethers.utils.parseEther("1") });
            await timeTravel(30 * 24 * 3600);
          });

          it("Prevents the creator from withdrawing any funds raised", async () => {
            // Note: In the case of a project failure, the Creator should not be able to
            // "withdraw" any funds raised. However, if the Creator personally contributed
            // funds to the project, they should still be able to get a "refund" for their
            // own personal contributions.
            await expect(
              project
                .connect(deployer)
                .claimProjectFund(ethers.utils.parseEther("0.5"))
            ).to.be.revertedWith("Project not completed");
            const prevBalance: BigNumber = await deployer.getBalance();
            expect(await project.connect(deployer).claimContributions()).to.be
              .ok;
            const newBalance: BigNumber = await deployer.getBalance();
            await closeTo(
              newBalance,
              prevBalance,
              ethers.utils.parseEther("1.001")
            );
          });

          it("Prevents contributors from withdrawing any funds raised", async () => {
            // Note: Same as above, but for contributors. Contributors should never be able
            // to "withdraw" all funds raised from the contract. However, in the case of
            // project failure, they should be able to "refund" the funds they personally
            // contributed.
            await expect(
              project
                .connect(alice)
                .claimProjectFund(ethers.utils.parseEther("0.5"))
            ).to.be.revertedWith("Unauthorized");
            const prevBalance: BigNumber = await alice.getBalance();
            expect(await project.connect(alice).claimContributions()).to.be.ok;
            const newBalance: BigNumber = await alice.getBalance();
            await closeTo(
              newBalance,
              prevBalance,
              ethers.utils.parseEther("1.001")
            );
          });

          it("Prevents non-contributors from withdrawing any funds", async () => {
            await expect(
              project.connect(sam).claimContributions()
            ).to.be.revertedWith("No contribution");
          });
        });
      });

      describe("Refunds", () => {
        it("Allows contributors to be refunded when a project fails", async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("1") });
          await timeTravel(30 * 24 * 3600);

          expect(await project.connect(alice).claimContributions()).to.be.ok;
        });

        it("Prevents contributors from being refunded if a project has not failed", async () => {
          await project
            .connect(deployer)
            .contribute({ value: ethers.utils.parseEther("1") });

          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("5") });

          await expect(
            project.connect(alice).claimContributions()
          ).to.be.revertedWith("Project active or completed");
        });

        it('Emits a "ContributorRefund" event after a a contributor receives a refund', async () => {
          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("1") });
          await timeTravel(30 * 24 * 3600);

          await expect(project.connect(alice).claimContributions())
            .to.be.emit(project, "ContributorRefund")
            .withArgs(alice.address, ONE_ETHER);
        });
      });

      describe("Cancelations (creator-triggered project failures)", () => {
        beforeEach(async () => {
          await project
            .connect(deployer)
            .contribute({ value: ethers.utils.parseEther("1") });

          await project
            .connect(alice)
            .contribute({ value: ethers.utils.parseEther("1") });
        });
        it("Allows the creator to cancel the project if < 30 days since deployment has passed", async () => {
          expect(await project.connect(deployer).cancelProject()).to.be.ok;
        });

        it("Prevents the creator from canceling the project if at least 30 days have passed", async () => {
          await timeTravel(30 * 24 * 3600);
          await expect(
            project.connect(deployer).cancelProject()
          ).to.be.revertedWith("Round ended");
        });

        it("Prevents the creator from canceling the project if it has already reached it's funding goal", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("3") });
          await expect(
            project.connect(deployer).cancelProject()
          ).to.be.revertedWith("Project not active");
        });

        it("Prevents the creator from canceling the project if it has already been canceled", async () => {
          // Note: A project can only be canceled once. If we allow the function to run to completion
          // again, it may have minimal impact on the contract's state, but it would emit a second
          // project cancelation event. This is undesirable because it may cause a discrepancy for
          // offchain applications that attempt to read when a project was canceled from the event log.
          expect(await project.connect(deployer).cancelProject()).to.be.ok;
          await expect(
            project.connect(deployer).cancelProject()
          ).to.be.revertedWith("Project not active");
        });

        it("Prevents non-creators from canceling the project", async () => {
          await expect(
            project.connect(alice).cancelProject()
          ).to.be.revertedWith("Unauthorized");
        });

        it('Emits a "ProjectCanceled" event after a project is canceled by the creator', async () => {
          const tx = await project.connect(deployer).cancelProject();
          const blockNum: any = tx.blockNumber;
          const minedTx = await tx?.wait();
          expect(minedTx.events![0].args![0]).to.equal(
            await (
              await ethers.provider.getBlock(blockNum)
            ).timestamp
          );
        });
      });

      describe("NFT Contributor Badges", () => {
        it("Awards a contributor with a badge when they make a single contribution of at least 1 ETH", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("1") });
          expect(await project.balanceOf(bob.address)).to.be.equal(1);
        });

        it("Awards a contributor with a badge when they make multiple contributions to a single project that sum to at least 1 ETH", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("0.5") });
          expect(await project.balanceOf(bob.address)).to.be.equal(0);

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("0.5") });
          expect(await project.balanceOf(bob.address)).to.be.equal(1);
        });

        it("Does not award a contributor with a badge if their total contribution to a single project sums to < 1 ETH", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("0.1") });

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("0.1") });

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("0.1") });

          expect(await project.balanceOf(bob.address)).to.be.equal(0);
        });

        it("Awards a contributor with a second badge when their total contribution to a single project sums to at least 2 ETH", async () => {
          // Note: One address can receive multiple badges for a single project,
          //       but they should only receive 1 badge per 1 ETH contributed.
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("0.5") });
          expect(await project.balanceOf(bob.address)).to.be.equal(0);

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("0.5") });
          expect(await project.balanceOf(bob.address)).to.be.equal(1);

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("1.2") });
          expect(await project.balanceOf(bob.address)).to.be.equal(2);

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("1") });
          expect(await project.balanceOf(bob.address)).to.be.equal(3);

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("0.8") });
          expect(await project.balanceOf(bob.address)).to.be.equal(4);
        });

        it("Does not award a contributor with a second badge if their total contribution to a single project is > 1 ETH but < 2 ETH", async () => {
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("0.5") });
          expect(await project.balanceOf(bob.address)).to.be.equal(0);

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("0.5") });
          expect(await project.balanceOf(bob.address)).to.be.equal(1);

          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("0.8") });
          expect(await project.balanceOf(bob.address)).to.be.equal(1);
        });

        it("Awards contributors with different NFTs for contributions to different projects", async () => {
          const txReceiptUnresolved1 = await projectFactory
            .connect(deployer)
            .create(ONE_ETHER.mul(3), AWESOME_NFT_NAME, AWESOME_NFT_SYMBOL);
          const txReceipt = await txReceiptUnresolved1.wait();

          const projectAddress1 = txReceipt.events![0].args![1];
          const project1 = (await ethers.getContractAt(
            "Project",
            projectAddress1
          )) as Project;

          await project
            .connect(sam)
            .contribute({ value: ethers.utils.parseEther("1.5") });
          expect(await project.balanceOf(sam.address)).to.be.equal(1);

          await project1
            .connect(sam)
            .contribute({ value: ethers.utils.parseEther("2.5") });
          expect(await project1.balanceOf(sam.address)).to.be.equal(2);
        });

        it("Allows contributor badge holders to trade the NFT to another address", async () => {
          await project
            .connect(deployer)
            .contribute({ value: ethers.utils.parseEther("1") });
          const tokenId = await project.tokenId();
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("1.5") });
          expect(await project.balanceOf(bob.address)).to.be.equal(1);
          expect(
            await project
              .connect(bob)
              .transferFrom(bob.address, deployer.address, tokenId)
          ).to.be.ok;
          expect(await project.balanceOf(deployer.address)).to.be.equal(2);
        });

        it("Allows contributor badge holders to trade the NFT to another address even after its related project fails", async () => {
          await project
            .connect(deployer)
            .contribute({ value: ethers.utils.parseEther("1") });

          const tokenId = await project.tokenId();
          await project
            .connect(bob)
            .contribute({ value: ethers.utils.parseEther("1.5") });
          expect(await project.balanceOf(bob.address)).to.be.equal(1);
          await timeTravel(30 * 24 * 3600);
          expect(
            await project
              .connect(bob)
              .transferFrom(bob.address, deployer.address, tokenId)
          ).to.be.ok;
          expect(await project.balanceOf(deployer.address)).to.be.equal(2);
        });
      });
    });
  });
});
