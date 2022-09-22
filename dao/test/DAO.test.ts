/* eslint-disable no-unused-expressions */
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, BigNumberish, Bytes, Wallet } from "ethers";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { DAO, DAOHelper, MockNftMarketplace } from "../typechain-types";

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

async function getCalldata(
  daoHelper: any,
  nftMarketplace: any,
  nftContract: any,
  nftId: any,
  maxPrice: any
) {
  let iface: any = new ethers.utils.Interface([
    "function buyNFTFromMarketplace(address,address,uint256,uint256)",
  ]);
  iface = iface.encodeFunctionData("buyNFTFromMarketplace", [
    nftMarketplace,
    nftContract,
    nftId,
    maxPrice,
  ]);

  return iface;
}

describe("DAO", () => {
  async function setupFixture() {
    const [
      deployer,
      alice,
      bob,
      sam,
      randomAddress1,
      randomAddress2,
      randomAddress3,
    ]: SignerWithAddress[] = await ethers.getSigners();

    const DAO = await ethers.getContractFactory("DAO");
    const DAOHelper = await ethers.getContractFactory("DAOHelper");
    const MockNftMarketplace = await ethers.getContractFactory(
      "MockNftMarketplace"
    );
    const dao: DAO = (await DAO.connect(deployer).deploy()) as DAO;
    const daoHelper: DAOHelper = (await DAOHelper.connect(deployer).deploy(
      dao.address
    )) as DAOHelper;
    const mockNftMarketplace: MockNftMarketplace =
      (await MockNftMarketplace.connect(
        deployer
      ).deploy()) as MockNftMarketplace;
    await dao.deployed();
    await daoHelper.deployed();
    await mockNftMarketplace.deployed();

    const daoAddress: string = dao.address;
    const randomAddresses: Array<string> = [
      randomAddress1.address,
      randomAddress2.address,
      randomAddress3.address,
    ];

    const randomValues: Array<BigNumber> = [
      ethers.utils.parseEther("0.01"),
      ethers.utils.parseEther("0.02"),
      ethers.utils.parseEther("0.01"),
    ];

    const randomCalldatas: Array<string> = [
      "0x2faed9a7",
      "0xc81d907b",
      "0xa8890671",
    ];

    const domain = {
      name: await dao.name(),
      chainId: await dao.getChainId(),
      verifyingContract: dao.address,
    };

    const types = {
      Ballot: [
        { name: "proposalId", type: "uint256" },
        { name: "support", type: "bool" },
      ],
    };

    return {
      dao,
      daoAddress,
      mockNftMarketplace,
      deployer,
      alice,
      bob,
      sam,
      randomAddresses,
      randomValues,
      randomCalldatas,
      daoHelper,
      randomAddress1,
      randomAddress2,
      randomAddress3,
      domain,
      types,
    };
  }

  describe("Deployment & Test Setup", () => {
    it("Deploys a contract", async () => {
      const { dao } = await loadFixture(setupFixture);

      expect(dao.address).to.be.properAddress;
    });

    it("Initializes a contract properly", async () => {
      const { dao } = await loadFixture(setupFixture);

      expect(await dao.currentMembers()).to.be.equal(0);
      expect(await dao.proposalCounterId()).to.be.equal(1);
    });
  });

  describe("Buying a membership", () => {
    it("Allows anyone to become a member by paying 1 ether", async () => {
      const { dao, alice } = await loadFixture(setupFixture);

      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.votingPower(alice.address)).to.be.equal(1);
      expect(await dao.currentMembers()).to.be.equal(1);

      const timeStamp = (await ethers.provider.getBlock("latest")).timestamp;
      expect(await dao.membershipCreationTime(alice.address)).to.be.equal(
        timeStamp
      );
    });

    it("Reverts on passing fee different with 1 ether", async () => {
      const { dao, alice } = await loadFixture(setupFixture);
      await expect(
        dao.connect(alice).buyMembership({ value: ONE_ETHER.mul(2) })
      ).to.be.revertedWithCustomError(dao, "InvalidFee");
    });

    it("Reverts if member tries to become member again", async () => {
      const { dao, alice } = await loadFixture(setupFixture);

      expect(await dao.connect(alice).buyMembership({ value: ONE_ETHER })).to.be
        .ok;

      await expect(
        dao.connect(alice).buyMembership({ value: ONE_ETHER })
      ).to.be.revertedWithCustomError(dao, "AlreadyMember");
    });
  });

  describe("Creation of Governance proposal", () => {
    it("Allows member to create proposal", async () => {
      const {
        dao,
        alice,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        mockNftMarketplace,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);
      expect(await dao.isMember(alice.address)).to.be.true;

      const nonceBefore = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(
            [...randomAddresses, dao.address],
            [...randomValues, ethers.utils.parseEther("0.02")],
            [
              ...randomCalldatas,
              await getCalldata(
                daoHelper,
                mockNftMarketplace.address,
                mockNftMarketplace.address,
                0,
                ethers.utils.parseEther("0.01")
              ),
            ]
          )
      ).to.emit(dao, "ProposalCreated");

      const timeStamp = (await ethers.provider.getBlock("latest")).timestamp;

      const proposalId = await daoHelper.hashProposal(
        [...randomAddresses, dao.address],
        [...randomValues, ethers.utils.parseEther("0.02")],
        [
          ...randomCalldatas,
          await getCalldata(
            daoHelper,
            mockNftMarketplace.address,
            mockNftMarketplace.address,
            0,
            ethers.utils.parseEther("0.01")
          ),
        ],
        nonceBefore
      );

      expect((await dao.proposals(proposalId)).nonce).to.equal(nonceBefore);
      expect((await dao.proposals(proposalId)).startTime).to.equal(timeStamp);
      expect((await dao.proposals(proposalId)).endTime).to.equal(
        timeStamp + SECONDS_IN_DAY * 7
      );
      expect((await dao.proposals(proposalId)).creator).to.equal(alice.address);
      expect((await dao.proposals(proposalId)).yesVotes).to.equal(0);
      expect((await dao.proposals(proposalId)).noVotes).to.equal(0);
      expect(
        (await dao.proposals(proposalId)).totalMembersAtTimeOfCreation
      ).to.equal(1);
      expect((await dao.proposals(proposalId)).executed).to.be.false;
    });

    it("Non member can not create proposal", async () => {
      const { dao, alice, randomAddresses, randomValues, randomCalldatas } =
        await loadFixture(setupFixture);
      expect(await dao.isMember(alice.address)).to.be.false;

      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.be.revertedWithCustomError(dao, "NotMember");
    });

    it("Array length mismatch between addresses and values reverts", async () => {
      const { dao, alice, randomAddresses, randomValues, randomCalldatas } =
        await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      expect(await dao.isMember(alice.address)).to.be.true;

      await expect(
        dao
          .connect(alice)
          .propose(
            [...randomAddresses, alice.address],
            randomValues,
            randomCalldatas
          )
      )
        .to.be.revertedWithCustomError(dao, "InvalidArguments")
        .withArgs("array length mismatch");
    });

    it("Array length mismatch between values and calldatas reverts", async () => {
      const { dao, alice, randomAddresses, randomValues, randomCalldatas } =
        await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      expect(await dao.isMember(alice.address)).to.be.true;

      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, [
            ...randomCalldatas,
            "0xdeadbeef",
          ])
      )
        .to.be.revertedWithCustomError(dao, "InvalidArguments")
        .withArgs("array length mismatch");
    });

    it("Array length mismatch between addresses and calldatas reverts", async () => {
      const { dao, alice, randomAddresses, randomValues, randomCalldatas } =
        await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      expect(await dao.isMember(alice.address)).to.be.true;

      await expect(
        dao
          .connect(alice)
          .propose(
            [...randomAddresses, alice.address],
            randomValues,
            randomCalldatas
          )
      )
        .to.be.revertedWithCustomError(dao, "InvalidArguments")
        .withArgs("array length mismatch");
    });

    it("Reverts on passing an empty array", async () => {
      const { dao, alice, randomAddresses, randomValues, randomCalldatas } =
        await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      expect(await dao.isMember(alice.address)).to.be.true;

      await expect(dao.connect(alice).propose([], [], []))
        .to.be.revertedWithCustomError(dao, "InvalidArguments")
        .withArgs("zero length");
    });
  });

  describe("Creation of Governance proposal", () => {
    it("Allows member to vote yes on created proposal", async () => {
      const {
        dao,
        alice,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);
      expect(await dao.isMember(alice.address)).to.be.true;
      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      await expect(dao.connect(alice).vote(proposalId, true))
        .to.emit(dao, "VoteCasted")
        .withArgs(alice.address, proposalId, true);
    });

    it("Allows member to vote no on created proposal", async () => {
      const {
        dao,
        alice,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);
      expect(await dao.isMember(alice.address)).to.be.true;
      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      await expect(dao.connect(alice).vote(proposalId, false))
        .to.emit(dao, "VoteCasted")
        .withArgs(alice.address, proposalId, false);
    });

    it("Reverts when non member votes on proposal", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);
      expect(await dao.isMember(alice.address)).to.be.true;
      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      await expect(
        dao.connect(bob).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, "NotMember");
    });

    it("member can't vote on invalid proposal", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);
      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      // Random number
      const proposalId: any = 334455;

      await expect(
        dao.connect(bob).vote(proposalId, false)
      ).to.be.revertedWithCustomError(dao, "InvalidProposalId");
    });

    it("member registered after proposal creation can't vote", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.false;

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);
      expect(await dao.isMember(bob.address)).to.be.true;

      await expect(
        dao.connect(bob).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, "NotMemberAtProposalCreation");
    });

    it("member can't vote again if they already voted", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

      await expect(
        dao.connect(bob).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, "AlreadyVoted");
    });

    it("member can't vote if proposal time expired", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      await expect(
        dao.connect(bob).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, "ProposalNotActive");
    });

    it("member can't vote if proposal is executed", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        mockNftMarketplace,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;

      const nonceBefore: BigNumber = await dao.proposalCounterId();

      const callData = getCalldata(
        daoHelper,
        mockNftMarketplace.address,
        mockNftMarketplace.address,
        0,
        ethers.utils.parseEther("0.01")
      );

      await expect(
        dao
          .connect(alice)
          .propose(
            [...randomAddresses, dao.address],
            [...randomValues, ethers.utils.parseEther("0")],
            [...randomCalldatas, callData]
          )
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        [...randomAddresses, dao.address],
        [...randomValues, ethers.utils.parseEther("0")],
        [...randomCalldatas, callData],
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      expect(
        await dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            [...randomAddresses, dao.address],
            [...randomValues, ethers.utils.parseEther("0")],
            [...randomCalldatas, callData]
          )
      ).to.be.ok;

      await expect(
        dao.connect(sam).vote(proposalId, true)
      ).to.be.revertedWithCustomError(dao, "ProposalNotActive");
    });

    describe("Passing of proposal", async () => {
      it("Proposal is passed if all three conditions are met", async () => {
        const {
          dao,
          alice,
          bob,
          sam,
          randomAddresses,
          randomValues,
          randomCalldatas,
          daoHelper,
        } = await loadFixture(setupFixture);
        await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
          .to.emit(dao, "MemberCreated")
          .withArgs(alice.address);

        await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
          .to.emit(dao, "MemberCreated")
          .withArgs(bob.address);

        await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
          .to.emit(dao, "MemberCreated")
          .withArgs(sam.address);

        expect(await dao.isMember(alice.address)).to.be.true;
        expect(await dao.isMember(bob.address)).to.be.true;
        expect(await dao.isMember(sam.address)).to.be.true;

        const nonceBefore: BigNumber = await dao.proposalCounterId();
        await expect(
          dao
            .connect(alice)
            .propose(randomAddresses, randomValues, randomCalldatas)
        ).to.emit(dao, "ProposalCreated");

        const proposalId: BigNumber = await daoHelper.hashProposal(
          randomAddresses,
          randomValues,
          randomCalldatas,
          nonceBefore
        );

        expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
        expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

        await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

        expect(
          await dao
            .connect(alice)
            .executeProposal(
              proposalId,
              nonceBefore,
              randomAddresses,
              randomValues,
              randomCalldatas
            )
        ).to.be.ok;

        await expect(
          dao.connect(sam).vote(proposalId, true)
        ).to.be.revertedWithCustomError(dao, "ProposalNotActive");
      });
    });

    it("Proposal fails if voting period hasn't concluded", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

      await expect(
        dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            randomAddresses,
            randomValues,
            randomCalldatas
          )
      ).to.be.revertedWithCustomError(dao, "ProposalNotPassed");
    });

    it("Proposal fails if yes votes is less or equal to no votes", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(proposalId, false)).to.be.ok;

      await expect(
        dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            randomAddresses,
            randomValues,
            randomCalldatas
          )
      ).to.be.revertedWithCustomError(dao, "ProposalNotPassed");
    });

    it("Proposal fails if 25% quorum is not met", async () => {
      const {
        dao,
        deployer,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(deployer).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(deployer.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;
      expect(await dao.isMember(deployer.address)).to.be.true;

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      await expect(
        dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            randomAddresses,
            randomValues,
            randomCalldatas
          )
      ).to.be.revertedWithCustomError(dao, "ProposalNotPassed");
    });
  });

  describe("Proposal execution", async () => {
    it("Reverts if invalid proposal id is passed", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const correctProposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      // random id
      const wrongProposalId: any = 334455;

      expect(await dao.connect(alice).vote(correctProposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(correctProposalId, true)).to.be.ok;

      await timeTravelTo(
        (await dao.proposals(correctProposalId)).endTime.add(1)
      );

      await expect(
        dao
          .connect(alice)
          .executeProposal(
            wrongProposalId,
            nonceBefore,
            randomAddresses,
            randomValues,
            randomCalldatas
          )
      ).to.be.revertedWithCustomError(dao, "InvalidProposalId");
    });

    it("Reverts if proposal is already executed", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      await expect(
        dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            randomAddresses,
            randomValues,
            randomCalldatas
          )
      )
        .to.emit(dao, "ProposalExecuted")
        .withArgs(proposalId);

      await expect(
        dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            randomAddresses,
            randomValues,
            randomCalldatas
          )
      ).to.be.revertedWithCustomError(dao, "ProposalAlreadyExecuted");
    });

    it("Reverts if invalid nonce  is passed", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      await expect(
        dao
          .connect(alice)
          .executeProposal(
            proposalId,
            55555,
            randomAddresses,
            randomValues,
            randomCalldatas
          )
      ).to.be.revertedWithCustomError(dao, "InvalidProposalId");
    });

    it("Reverts if external call fails on execution of proposal", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;

      const randomUpdatedValues = [
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
      ];

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomUpdatedValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomUpdatedValues,
        randomCalldatas,
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      await expect(
        dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            randomAddresses,
            randomUpdatedValues,
            randomCalldatas
          )
      ).to.be.revertedWithCustomError(dao, "ExternalCallFailed");
    });

    it("Executes the proposal successfully", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      expect(
        await dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            randomAddresses,
            randomValues,
            randomCalldatas
          )
      ).to.be.ok;
    });

    it("Reverts if buying NFT fails from marketplace", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        mockNftMarketplace,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;

      const callData = getCalldata(
        daoHelper,
        mockNftMarketplace.address,
        mockNftMarketplace.address,
        25,
        ethers.utils.parseEther("0.01")
      );

      const randomUpdatedValues = [
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0"),
      ];

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose([...randomAddresses, dao.address], randomUpdatedValues, [
            ...randomCalldatas,
            callData,
          ])
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        [...randomAddresses, dao.address],
        randomUpdatedValues,
        [...randomCalldatas, callData],
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      await expect(
        dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            [...randomAddresses, dao.address],
            randomUpdatedValues,
            [...randomCalldatas, callData]
          )
      ).to.be.revertedWithCustomError(dao, "ExternalCallFailed");
    });

    it("Reverts if NFT price is more than maxPrice", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        mockNftMarketplace,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;

      const callData = getCalldata(
        daoHelper,
        mockNftMarketplace.address,
        mockNftMarketplace.address,
        1,
        ethers.utils.parseEther("0.001")
      );

      const randomUpdatedValues = [
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0"),
      ];

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose([...randomAddresses, dao.address], randomUpdatedValues, [
            ...randomCalldatas,
            callData,
          ])
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        [...randomAddresses, dao.address],
        randomUpdatedValues,
        [...randomCalldatas, callData],
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      await expect(
        dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            [...randomAddresses, dao.address],
            randomUpdatedValues,
            [...randomCalldatas, callData]
          )
      ).to.be.revertedWithCustomError(dao, "ExternalCallFailed");
    });

    it("Executes successfully if 25% quorum is reached", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        mockNftMarketplace,
        randomAddress1,
        randomAddress2,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;
      expect(await dao.isMember(randomAddress1.address)).to.be.true;

      const callData = getCalldata(
        daoHelper,
        mockNftMarketplace.address,
        mockNftMarketplace.address,
        1,
        ethers.utils.parseEther("0.01")
      );

      const randomUpdatedValues = [
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0"),
      ];

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose([...randomAddresses, dao.address], randomUpdatedValues, [
            ...randomCalldatas,
            callData,
          ])
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        [...randomAddresses, dao.address],
        randomUpdatedValues,
        [...randomCalldatas, callData],
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      expect(
        await dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            [...randomAddresses, dao.address],
            randomUpdatedValues,
            [...randomCalldatas, callData]
          )
      ).to.be.ok;
    });

    it("Reverts if 25% quorum is not reached", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        mockNftMarketplace,
        randomAddress1,
        randomAddress2,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;
      expect(await dao.isMember(randomAddress1.address)).to.be.true;
      expect(await dao.isMember(randomAddress2.address)).to.be.true;

      const callData = getCalldata(
        daoHelper,
        mockNftMarketplace.address,
        mockNftMarketplace.address,
        1,
        ethers.utils.parseEther("0.01")
      );

      const randomUpdatedValues = [
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0.01"),
        ethers.utils.parseEther("0"),
      ];

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose([...randomAddresses, dao.address], randomUpdatedValues, [
            ...randomCalldatas,
            callData,
          ])
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        [...randomAddresses, dao.address],
        randomUpdatedValues,
        [...randomCalldatas, callData],
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      await expect(
        dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            [...randomAddresses, dao.address],
            randomUpdatedValues,
            [...randomCalldatas, callData]
          )
      ).to.be.revertedWithCustomError(dao, "ProposalNotPassed");
    });

    it("Sends 0.01 ether to executor of proposal", async () => {
      const {
        dao,
        alice,
        bob,
        sam,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(dao.connect(sam).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(sam.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      expect(await dao.isMember(alice.address)).to.be.true;
      expect(await dao.isMember(bob.address)).to.be.true;
      expect(await dao.isMember(sam.address)).to.be.true;

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      const votingPowerBefore = await dao.votingPower(alice.address);
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));
      const aliceBalanceBefore: BigNumberish = await alice.getBalance();

      expect(
        await dao
          .connect(alice)
          .executeProposal(
            proposalId,
            nonceBefore,
            randomAddresses,
            randomValues,
            randomCalldatas
          )
      ).to.be.ok;

      const aliceBalanceAfter: BigNumberish = await alice.getBalance();
      const votingPowerAfter = await dao.votingPower(alice.address);
      expect(aliceBalanceAfter).to.be.greaterThan(aliceBalanceBefore);
      expect(votingPowerAfter).to.equal(votingPowerBefore.add(1));
    });
  });

  describe("Off chain generated EIP-712 signatures", async () => {
    it("Allows any address to vote yes using signature", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao.connect(bob).propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;

      const support = true;

      const data = {
        proposalId,
        support,
      };

      const signature = await alice._signTypedData(domain, types, data);
      const expandedSignature = ethers.utils.splitSignature(signature);

      await expect(
        dao.castVoteBySignature(
          proposalId,
          support,
          expandedSignature.v,
          expandedSignature.r,
          expandedSignature.s
        )
      )
        .to.emit(dao, "VoteCasted")
        .withArgs(alice.address, proposalId, true);

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.true;
      expect(yesVotesAfter).to.be.equal(
        yesVotesBefore.add(await dao.votingPower(alice.address))
      );
    });

    it("Allows any address to vote no using signature", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao.connect(bob).propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const support = false;

      const data = {
        proposalId,
        support,
      };

      const signature = await alice._signTypedData(domain, types, data);
      const expandedSignature = ethers.utils.splitSignature(signature);

      await expect(
        dao.castVoteBySignature(
          proposalId,
          support,
          expandedSignature.v,
          expandedSignature.r,
          expandedSignature.s
        )
      )
        .to.emit(dao, "VoteCasted")
        .withArgs(alice.address, proposalId, false);

      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.true;
      expect(noVotesAfter).to.be.equal(
        noVotesBefore.add(await dao.votingPower(alice.address))
      );
    });

    it("Reverts on voting with invalid signature", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao.connect(bob).propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;

      const support = true;

      const data = {
        proposalId: 334455,
        support,
      };

      const signature = await alice._signTypedData(domain, types, data);
      const expandedSignature = ethers.utils.splitSignature(signature);

      await expect(
        dao.castVoteBySignature(
          proposalId,
          support,
          expandedSignature.v,
          expandedSignature.r,
          expandedSignature.s
        )
      ).to.be.revertedWithCustomError(dao, "NotMember");

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
    });

    it("Reverts if member is created after proposal creation", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
      } = await loadFixture(setupFixture);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao.connect(bob).propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;

      const support = true;

      const data = {
        proposalId,
        support,
      };

      const signature = await alice._signTypedData(domain, types, data);
      const expandedSignature = ethers.utils.splitSignature(signature);

      await expect(
        dao.castVoteBySignature(
          proposalId,
          support,
          expandedSignature.v,
          expandedSignature.r,
          expandedSignature.s
        )
      ).to.be.revertedWithCustomError(dao, "NotMemberAtProposalCreation");

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
    });

    it("Reverts if member has already voted", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
      } = await loadFixture(setupFixture);

      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao.connect(bob).propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      await dao.connect(alice).vote(proposalId, true);

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;

      const support = true;

      const data = {
        proposalId,
        support,
      };

      const signature = await alice._signTypedData(domain, types, data);
      const expandedSignature = ethers.utils.splitSignature(signature);

      await expect(
        dao.castVoteBySignature(
          proposalId,
          support,
          expandedSignature.v,
          expandedSignature.r,
          expandedSignature.s
        )
      ).to.be.revertedWithCustomError(dao, "AlreadyVoted");

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.true;
      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
    });

    it("Reverts if proposal is not active", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
      } = await loadFixture(setupFixture);

      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao.connect(bob).propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;

      const support = true;

      const data = {
        proposalId,
        support,
      };

      const signature = await alice._signTypedData(domain, types, data);
      const expandedSignature = ethers.utils.splitSignature(signature);

      await expect(
        dao.castVoteBySignature(
          proposalId,
          support,
          expandedSignature.v,
          expandedSignature.r,
          expandedSignature.s
        )
      ).to.be.revertedWithCustomError(dao, "ProposalNotActive");

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
    });

    it("Reverts if proposal is executed", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
      } = await loadFixture(setupFixture);

      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao.connect(bob).propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      await dao.connect(bob).vote(proposalId, true);

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      await dao
        .connect(bob)
        .executeProposal(
          proposalId,
          nonceBefore,
          randomAddresses,
          randomValues,
          randomCalldatas
        );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;

      const support = true;

      const data = {
        proposalId,
        support,
      };

      const signature = await alice._signTypedData(domain, types, data);
      const expandedSignature = ethers.utils.splitSignature(signature);

      await expect(
        dao.castVoteBySignature(
          proposalId,
          support,
          expandedSignature.v,
          expandedSignature.r,
          expandedSignature.s
        )
      ).to.be.revertedWithCustomError(dao, "ProposalNotActive");

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
    });
  });

  describe("Casting Bulk vote", async () => {
    it("Can cast bulk votes", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;
      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const yesData = {
        proposalId,
        support: true,
      };

      const noData = {
        proposalId,
        support: false,
      };

      const signature1 = await alice._signTypedData(domain, types, yesData);
      const signature2 = await bob._signTypedData(domain, types, yesData);
      const signature3 = await randomAddress1._signTypedData(
        domain,
        types,
        noData
      );
      const signature4 = await randomAddress2._signTypedData(
        domain,
        types,
        noData
      );
      const signature5 = await randomAddress3._signTypedData(
        domain,
        types,
        yesData
      );

      const expandedSignature1 = ethers.utils.splitSignature(signature1);
      const expandedSignature2 = ethers.utils.splitSignature(signature2);
      const expandedSignature3 = ethers.utils.splitSignature(signature3);
      const expandedSignature4 = ethers.utils.splitSignature(signature4);
      const expandedSignature5 = ethers.utils.splitSignature(signature5);

      const proposalIdArr = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const supportArr = [true, true, false, false, true];
      const vArr = [
        expandedSignature1.v,
        expandedSignature2.v,
        expandedSignature3.v,
        expandedSignature4.v,
        expandedSignature5.v,
      ];
      const rArr = [
        expandedSignature1.r,
        expandedSignature2.r,
        expandedSignature3.r,
        expandedSignature4.r,
        expandedSignature5.r,
      ];
      const sArr = [
        expandedSignature1.s,
        expandedSignature2.s,
        expandedSignature3.s,
        expandedSignature4.s,
        expandedSignature5.s,
      ];

      expect(
        await dao.castBulkVoteBySignature(
          proposalIdArr,
          supportArr,
          vArr,
          rArr,
          sArr
        )
      ).to.be.ok;

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;
      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.true;
      expect(await dao.hasVoted(bob.address, proposalId)).to.be.true;
      expect(await dao.hasVoted(randomAddress1.address, proposalId)).to.be.true;
      expect(await dao.hasVoted(randomAddress2.address, proposalId)).to.be.true;
      expect(await dao.hasVoted(randomAddress3.address, proposalId)).to.be.true;

      expect(yesVotesAfter).to.be.equal(yesVotesBefore.add(3));
      expect(noVotesAfter).to.be.equal(noVotesBefore.add(2));
    });

    it("Reverts with invalid arguments on empty proposal array", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;
      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const yesData = {
        proposalId,
        support: true,
      };

      const noData = {
        proposalId,
        support: false,
      };

      const signature1 = await alice._signTypedData(domain, types, yesData);
      const signature2 = await bob._signTypedData(domain, types, yesData);
      const signature3 = await randomAddress1._signTypedData(
        domain,
        types,
        noData
      );
      const signature4 = await randomAddress2._signTypedData(
        domain,
        types,
        noData
      );
      const signature5 = await randomAddress3._signTypedData(
        domain,
        types,
        yesData
      );

      const expandedSignature1 = ethers.utils.splitSignature(signature1);
      const expandedSignature2 = ethers.utils.splitSignature(signature2);
      const expandedSignature3 = ethers.utils.splitSignature(signature3);
      const expandedSignature4 = ethers.utils.splitSignature(signature4);
      const expandedSignature5 = ethers.utils.splitSignature(signature5);

      const proposalIdArr: Array<any> = [];
      const supportArr = [true, true, false, false, true];
      const vArr = [
        expandedSignature1.v,
        expandedSignature2.v,
        expandedSignature3.v,
        expandedSignature4.v,
        expandedSignature5.v,
      ];
      const rArr = [
        expandedSignature1.r,
        expandedSignature2.r,
        expandedSignature3.r,
        expandedSignature4.r,
        expandedSignature5.r,
      ];
      const sArr = [
        expandedSignature1.s,
        expandedSignature2.s,
        expandedSignature3.s,
        expandedSignature4.s,
        expandedSignature5.s,
      ];

      await expect(
        dao.castBulkVoteBySignature(proposalIdArr, supportArr, vArr, rArr, sArr)
      )
        .to.be.revertedWithCustomError(dao, "InvalidArguments")
        .withArgs("empty list");

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;
      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(bob.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(randomAddress1.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress2.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress3.address, proposalId)).to.be
        .false;

      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
      expect(noVotesAfter).to.be.equal(noVotesBefore);
    });

    it("Reverts if invalid support array is passed", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;
      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const yesData = {
        proposalId,
        support: true,
      };

      const noData = {
        proposalId,
        support: false,
      };

      const signature1 = await alice._signTypedData(domain, types, yesData);
      const signature2 = await bob._signTypedData(domain, types, yesData);
      const signature3 = await randomAddress1._signTypedData(
        domain,
        types,
        noData
      );
      const signature4 = await randomAddress2._signTypedData(
        domain,
        types,
        noData
      );
      const signature5 = await randomAddress3._signTypedData(
        domain,
        types,
        yesData
      );

      const expandedSignature1 = ethers.utils.splitSignature(signature1);
      const expandedSignature2 = ethers.utils.splitSignature(signature2);
      const expandedSignature3 = ethers.utils.splitSignature(signature3);
      const expandedSignature4 = ethers.utils.splitSignature(signature4);
      const expandedSignature5 = ethers.utils.splitSignature(signature5);

      const proposalIdArr = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const supportArr = [true, true, false, false];
      const vArr = [
        expandedSignature1.v,
        expandedSignature2.v,
        expandedSignature3.v,
        expandedSignature4.v,
        expandedSignature5.v,
      ];
      const rArr = [
        expandedSignature1.r,
        expandedSignature2.r,
        expandedSignature3.r,
        expandedSignature4.r,
        expandedSignature5.r,
      ];
      const sArr = [
        expandedSignature1.s,
        expandedSignature2.s,
        expandedSignature3.s,
        expandedSignature4.s,
        expandedSignature5.s,
      ];

      await expect(
        dao.castBulkVoteBySignature(proposalIdArr, supportArr, vArr, rArr, sArr)
      )
        .to.be.revertedWithCustomError(dao, "InvalidArguments")
        .withArgs("support list invalid");

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;
      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(bob.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(randomAddress1.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress2.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress3.address, proposalId)).to.be
        .false;

      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
      expect(noVotesAfter).to.be.equal(noVotesBefore);
    });

    it("Reverts if invalid v array is passed", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;
      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const yesData = {
        proposalId,
        support: true,
      };

      const noData = {
        proposalId,
        support: false,
      };

      const signature1 = await alice._signTypedData(domain, types, yesData);
      const signature2 = await bob._signTypedData(domain, types, yesData);
      const signature3 = await randomAddress1._signTypedData(
        domain,
        types,
        noData
      );
      const signature4 = await randomAddress2._signTypedData(
        domain,
        types,
        noData
      );
      const signature5 = await randomAddress3._signTypedData(
        domain,
        types,
        yesData
      );

      const expandedSignature1 = ethers.utils.splitSignature(signature1);
      const expandedSignature2 = ethers.utils.splitSignature(signature2);
      const expandedSignature3 = ethers.utils.splitSignature(signature3);
      const expandedSignature4 = ethers.utils.splitSignature(signature4);
      const expandedSignature5 = ethers.utils.splitSignature(signature5);

      const proposalIdArr = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const supportArr = [true, true, false, false, true];
      const vArr = [
        expandedSignature1.v,
        expandedSignature2.v,
        expandedSignature3.v,
        expandedSignature4.v,
      ];
      const rArr = [
        expandedSignature1.r,
        expandedSignature2.r,
        expandedSignature3.r,
        expandedSignature4.r,
        expandedSignature5.r,
      ];
      const sArr = [
        expandedSignature1.s,
        expandedSignature2.s,
        expandedSignature3.s,
        expandedSignature4.s,
        expandedSignature5.s,
      ];

      await expect(
        dao.castBulkVoteBySignature(proposalIdArr, supportArr, vArr, rArr, sArr)
      )
        .to.be.revertedWithCustomError(dao, "InvalidArguments")
        .withArgs("v list invalid");

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;
      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(bob.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(randomAddress1.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress2.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress3.address, proposalId)).to.be
        .false;

      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
      expect(noVotesAfter).to.be.equal(noVotesBefore);
    });

    it("Reverts if invalid r array is passed", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;
      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const yesData = {
        proposalId,
        support: true,
      };

      const noData = {
        proposalId,
        support: false,
      };

      const signature1 = await alice._signTypedData(domain, types, yesData);
      const signature2 = await bob._signTypedData(domain, types, yesData);
      const signature3 = await randomAddress1._signTypedData(
        domain,
        types,
        noData
      );
      const signature4 = await randomAddress2._signTypedData(
        domain,
        types,
        noData
      );
      const signature5 = await randomAddress3._signTypedData(
        domain,
        types,
        yesData
      );

      const expandedSignature1 = ethers.utils.splitSignature(signature1);
      const expandedSignature2 = ethers.utils.splitSignature(signature2);
      const expandedSignature3 = ethers.utils.splitSignature(signature3);
      const expandedSignature4 = ethers.utils.splitSignature(signature4);
      const expandedSignature5 = ethers.utils.splitSignature(signature5);

      const proposalIdArr = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const supportArr = [true, true, false, false, true];
      const vArr = [
        expandedSignature1.v,
        expandedSignature2.v,
        expandedSignature3.v,
        expandedSignature4.v,
        expandedSignature5.v,
      ];
      const rArr = [
        expandedSignature1.r,
        expandedSignature2.r,
        expandedSignature3.r,
        expandedSignature4.r,
      ];
      const sArr = [
        expandedSignature1.s,
        expandedSignature2.s,
        expandedSignature3.s,
        expandedSignature4.s,
        expandedSignature5.s,
      ];

      await expect(
        dao.castBulkVoteBySignature(proposalIdArr, supportArr, vArr, rArr, sArr)
      )
        .to.be.revertedWithCustomError(dao, "InvalidArguments")
        .withArgs("r list invalid");

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;
      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(bob.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(randomAddress1.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress2.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress3.address, proposalId)).to.be
        .false;

      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
      expect(noVotesAfter).to.be.equal(noVotesBefore);
    });

    it("Reverts if invalid s array is passed", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;
      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const yesData = {
        proposalId,
        support: true,
      };

      const noData = {
        proposalId,
        support: false,
      };

      const signature1 = await alice._signTypedData(domain, types, yesData);
      const signature2 = await bob._signTypedData(domain, types, yesData);
      const signature3 = await randomAddress1._signTypedData(
        domain,
        types,
        noData
      );
      const signature4 = await randomAddress2._signTypedData(
        domain,
        types,
        noData
      );
      const signature5 = await randomAddress3._signTypedData(
        domain,
        types,
        yesData
      );

      const expandedSignature1 = ethers.utils.splitSignature(signature1);
      const expandedSignature2 = ethers.utils.splitSignature(signature2);
      const expandedSignature3 = ethers.utils.splitSignature(signature3);
      const expandedSignature4 = ethers.utils.splitSignature(signature4);
      const expandedSignature5 = ethers.utils.splitSignature(signature5);

      const proposalIdArr = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const supportArr = [true, true, false, false, true];
      const vArr = [
        expandedSignature1.v,
        expandedSignature2.v,
        expandedSignature3.v,
        expandedSignature4.v,
        expandedSignature5.v,
      ];
      const rArr = [
        expandedSignature1.r,
        expandedSignature2.r,
        expandedSignature3.r,
        expandedSignature4.r,
        expandedSignature5.r,
      ];
      const sArr = [
        expandedSignature1.s,
        expandedSignature2.s,
        expandedSignature3.s,
        expandedSignature4.s,
      ];

      await expect(
        dao.castBulkVoteBySignature(proposalIdArr, supportArr, vArr, rArr, sArr)
      )
        .to.be.revertedWithCustomError(dao, "InvalidArguments")
        .withArgs("s list invalid");

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;
      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(bob.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(randomAddress1.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress2.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress3.address, proposalId)).to.be
        .false;

      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
      expect(noVotesAfter).to.be.equal(noVotesBefore);
    });

    it("Reverts if signer is not a member", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;
      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const yesData = {
        proposalId,
        support: true,
      };

      const noData = {
        proposalId,
        support: false,
      };

      const signature1 = await alice._signTypedData(domain, types, yesData);
      const signature2 = await bob._signTypedData(domain, types, yesData);
      const signature3 = await randomAddress1._signTypedData(
        domain,
        types,
        noData
      );
      const signature4 = await randomAddress2._signTypedData(
        domain,
        types,
        noData
      );
      const signature5 = await randomAddress3._signTypedData(
        domain,
        types,
        yesData
      );

      const expandedSignature1 = ethers.utils.splitSignature(signature1);
      const expandedSignature2 = ethers.utils.splitSignature(signature2);
      const expandedSignature3 = ethers.utils.splitSignature(signature3);
      const expandedSignature4 = ethers.utils.splitSignature(signature4);
      const expandedSignature5 = ethers.utils.splitSignature(signature5);

      const proposalIdArr = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const supportArr = [true, true, false, false, true];
      const vArr = [
        expandedSignature1.v,
        expandedSignature2.v,
        expandedSignature3.v,
        expandedSignature4.v,
        expandedSignature5.v,
      ];
      const rArr = [
        expandedSignature1.r,
        expandedSignature2.r,
        expandedSignature3.r,
        expandedSignature4.r,
        expandedSignature5.r,
      ];
      const sArr = [
        expandedSignature1.s,
        expandedSignature2.s,
        expandedSignature3.s,
        expandedSignature4.s,
        expandedSignature5.s,
      ];

      await expect(
        dao.castBulkVoteBySignature(proposalIdArr, supportArr, vArr, rArr, sArr)
      )
        .to.be.revertedWithCustomError(dao, "SignatureVerificationBatchFailed")
        .withArgs(1, proposalId);

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;
      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(bob.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(randomAddress1.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress2.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress3.address, proposalId)).to.be
        .false;

      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
      expect(noVotesAfter).to.be.equal(noVotesBefore);
    });

    it("Reverts if signer obtains membership after proposal creation", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;
      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const yesData = {
        proposalId,
        support: true,
      };

      const noData = {
        proposalId,
        support: false,
      };

      const signature1 = await alice._signTypedData(domain, types, yesData);
      const signature2 = await bob._signTypedData(domain, types, yesData);
      const signature3 = await randomAddress1._signTypedData(
        domain,
        types,
        noData
      );
      const signature4 = await randomAddress2._signTypedData(
        domain,
        types,
        noData
      );
      const signature5 = await randomAddress3._signTypedData(
        domain,
        types,
        yesData
      );

      const expandedSignature1 = ethers.utils.splitSignature(signature1);
      const expandedSignature2 = ethers.utils.splitSignature(signature2);
      const expandedSignature3 = ethers.utils.splitSignature(signature3);
      const expandedSignature4 = ethers.utils.splitSignature(signature4);
      const expandedSignature5 = ethers.utils.splitSignature(signature5);

      const proposalIdArr = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const supportArr = [true, true, false, false, true];
      const vArr = [
        expandedSignature1.v,
        expandedSignature2.v,
        expandedSignature3.v,
        expandedSignature4.v,
        expandedSignature5.v,
      ];
      const rArr = [
        expandedSignature1.r,
        expandedSignature2.r,
        expandedSignature3.r,
        expandedSignature4.r,
        expandedSignature5.r,
      ];
      const sArr = [
        expandedSignature1.s,
        expandedSignature2.s,
        expandedSignature3.s,
        expandedSignature4.s,
        expandedSignature5.s,
      ];

      await expect(
        dao.castBulkVoteBySignature(proposalIdArr, supportArr, vArr, rArr, sArr)
      )
        .to.be.revertedWithCustomError(dao, "SignatureVerificationBatchFailed")
        .withArgs(1, proposalId);

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;
      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(bob.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(randomAddress1.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress2.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress3.address, proposalId)).to.be
        .false;

      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
      expect(noVotesAfter).to.be.equal(noVotesBefore);
    });

    it("Reverts if signer has already voted", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;
      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const yesData = {
        proposalId,
        support: true,
      };

      const noData = {
        proposalId,
        support: false,
      };

      const signature1 = await alice._signTypedData(domain, types, yesData);
      const signature2 = await bob._signTypedData(domain, types, yesData);
      const signature3 = await randomAddress1._signTypedData(
        domain,
        types,
        noData
      );
      const signature4 = await randomAddress2._signTypedData(
        domain,
        types,
        noData
      );
      const signature5 = await randomAddress3._signTypedData(
        domain,
        types,
        yesData
      );

      const expandedSignature1 = ethers.utils.splitSignature(signature1);
      const expandedSignature2 = ethers.utils.splitSignature(signature2);
      const expandedSignature3 = ethers.utils.splitSignature(signature3);
      const expandedSignature4 = ethers.utils.splitSignature(signature4);
      const expandedSignature5 = ethers.utils.splitSignature(signature5);

      const proposalIdArr = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const supportArr = [true, true, false, false, true];
      const vArr = [
        expandedSignature1.v,
        expandedSignature2.v,
        expandedSignature3.v,
        expandedSignature4.v,
        expandedSignature5.v,
      ];
      const rArr = [
        expandedSignature1.r,
        expandedSignature2.r,
        expandedSignature3.r,
        expandedSignature4.r,
        expandedSignature5.r,
      ];
      const sArr = [
        expandedSignature1.s,
        expandedSignature2.s,
        expandedSignature3.s,
        expandedSignature4.s,
        expandedSignature5.s,
      ];

      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;

      await expect(
        dao.castBulkVoteBySignature(proposalIdArr, supportArr, vArr, rArr, sArr)
      )
        .to.be.revertedWithCustomError(dao, "SignatureVerificationBatchFailed")
        .withArgs(1, proposalId);

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;
      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(bob.address, proposalId)).to.be.true;
      expect(await dao.hasVoted(randomAddress1.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress2.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress3.address, proposalId)).to.be
        .false;

      expect(yesVotesAfter).to.be.equal(yesVotesBefore.add(1));
      expect(noVotesAfter).to.be.equal(noVotesBefore);
    });

    it("Reverts if proposal voting period is over", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;
      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const yesData = {
        proposalId,
        support: true,
      };

      const noData = {
        proposalId,
        support: false,
      };

      const signature1 = await alice._signTypedData(domain, types, yesData);
      const signature2 = await bob._signTypedData(domain, types, yesData);
      const signature3 = await randomAddress1._signTypedData(
        domain,
        types,
        noData
      );
      const signature4 = await randomAddress2._signTypedData(
        domain,
        types,
        noData
      );
      const signature5 = await randomAddress3._signTypedData(
        domain,
        types,
        yesData
      );

      const expandedSignature1 = ethers.utils.splitSignature(signature1);
      const expandedSignature2 = ethers.utils.splitSignature(signature2);
      const expandedSignature3 = ethers.utils.splitSignature(signature3);
      const expandedSignature4 = ethers.utils.splitSignature(signature4);
      const expandedSignature5 = ethers.utils.splitSignature(signature5);

      const proposalIdArr = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const supportArr = [true, true, false, false, true];
      const vArr = [
        expandedSignature1.v,
        expandedSignature2.v,
        expandedSignature3.v,
        expandedSignature4.v,
        expandedSignature5.v,
      ];
      const rArr = [
        expandedSignature1.r,
        expandedSignature2.r,
        expandedSignature3.r,
        expandedSignature4.r,
        expandedSignature5.r,
      ];
      const sArr = [
        expandedSignature1.s,
        expandedSignature2.s,
        expandedSignature3.s,
        expandedSignature4.s,
        expandedSignature5.s,
      ];

      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      await expect(
        dao.castBulkVoteBySignature(proposalIdArr, supportArr, vArr, rArr, sArr)
      )
        .to.be.revertedWithCustomError(dao, "SignatureVerificationBatchFailed")
        .withArgs(0, proposalId);

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;
      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(bob.address, proposalId)).to.be.false;
      expect(await dao.hasVoted(randomAddress1.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress2.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress3.address, proposalId)).to.be
        .false;

      expect(yesVotesAfter).to.be.equal(yesVotesBefore);
      expect(noVotesAfter).to.be.equal(noVotesBefore);
    });

    it("Reverts if proposal is already executed", async () => {
      const {
        dao,
        alice,
        bob,
        randomAddresses,
        randomValues,
        randomCalldatas,
        daoHelper,
        domain,
        types,
        randomAddress1,
        randomAddress2,
        randomAddress3,
      } = await loadFixture(setupFixture);
      await expect(dao.connect(alice).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(alice.address);

      await expect(dao.connect(bob).buyMembership({ value: ONE_ETHER }))
        .to.emit(dao, "MemberCreated")
        .withArgs(bob.address);

      await expect(
        dao.connect(randomAddress1).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress1.address);

      await expect(
        dao.connect(randomAddress2).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress2.address);

      await expect(
        dao.connect(randomAddress3).buyMembership({ value: ONE_ETHER })
      )
        .to.emit(dao, "MemberCreated")
        .withArgs(randomAddress3.address);

      const nonceBefore: BigNumber = await dao.proposalCounterId();
      await expect(
        dao
          .connect(alice)
          .propose(randomAddresses, randomValues, randomCalldatas)
      ).to.emit(dao, "ProposalCreated");

      const proposalId: BigNumber = await daoHelper.hashProposal(
        randomAddresses,
        randomValues,
        randomCalldatas,
        nonceBefore
      );

      const yesVotesBefore = (await dao.proposals(proposalId)).yesVotes;
      const noVotesBefore = (await dao.proposals(proposalId)).noVotes;

      const yesData = {
        proposalId,
        support: true,
      };

      const noData = {
        proposalId,
        support: false,
      };

      const signature1 = await alice._signTypedData(domain, types, yesData);
      const signature2 = await bob._signTypedData(domain, types, yesData);
      const signature3 = await randomAddress1._signTypedData(
        domain,
        types,
        noData
      );
      const signature4 = await randomAddress2._signTypedData(
        domain,
        types,
        noData
      );
      const signature5 = await randomAddress3._signTypedData(
        domain,
        types,
        yesData
      );

      const expandedSignature1 = ethers.utils.splitSignature(signature1);
      const expandedSignature2 = ethers.utils.splitSignature(signature2);
      const expandedSignature3 = ethers.utils.splitSignature(signature3);
      const expandedSignature4 = ethers.utils.splitSignature(signature4);
      const expandedSignature5 = ethers.utils.splitSignature(signature5);

      const proposalIdArr = [
        proposalId,
        proposalId,
        proposalId,
        proposalId,
        proposalId,
      ];
      const supportArr = [true, true, false, false, true];
      const vArr = [
        expandedSignature1.v,
        expandedSignature2.v,
        expandedSignature3.v,
        expandedSignature4.v,
        expandedSignature5.v,
      ];
      const rArr = [
        expandedSignature1.r,
        expandedSignature2.r,
        expandedSignature3.r,
        expandedSignature4.r,
        expandedSignature5.r,
      ];
      const sArr = [
        expandedSignature1.s,
        expandedSignature2.s,
        expandedSignature3.s,
        expandedSignature4.s,
        expandedSignature5.s,
      ];

      expect(await dao.connect(alice).vote(proposalId, true)).to.be.ok;
      expect(await dao.connect(bob).vote(proposalId, true)).to.be.ok;
      await timeTravelTo((await dao.proposals(proposalId)).endTime.add(1));

      expect(
        await dao
          .connect(randomAddress1)
          .executeProposal(
            proposalId,
            nonceBefore,
            randomAddresses,
            randomValues,
            randomCalldatas
          )
      ).to.be.ok;

      await expect(
        dao.castBulkVoteBySignature(proposalIdArr, supportArr, vArr, rArr, sArr)
      )
        .to.be.revertedWithCustomError(dao, "SignatureVerificationBatchFailed")
        .withArgs(0, proposalId);

      const yesVotesAfter = (await dao.proposals(proposalId)).yesVotes;
      const noVotesAfter = (await dao.proposals(proposalId)).noVotes;

      expect(await dao.hasVoted(alice.address, proposalId)).to.be.true;
      expect(await dao.hasVoted(bob.address, proposalId)).to.be.true;
      expect(await dao.hasVoted(randomAddress1.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress2.address, proposalId)).to.be
        .false;
      expect(await dao.hasVoted(randomAddress3.address, proposalId)).to.be
        .false;

      expect(yesVotesAfter).to.be.equal(yesVotesBefore.add(2));
      expect(noVotesAfter).to.be.equal(noVotesBefore);
    });
  });
});
