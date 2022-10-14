import { utils } from 'ethers';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Airdrop, ERC20, MacroToken, MerkleHelper } from "../typechain-types"

const provider = ethers.provider
let owner: SignerWithAddress
let account1: SignerWithAddress
let account2: SignerWithAddress
let account3: SignerWithAddress
let account4: SignerWithAddress
let rest: SignerWithAddress[]

let macroToken: MacroToken
let airdrop: Airdrop
let merkleHelper: MerkleHelper
let merkleRoot: string
let leafs: any[] = []

describe("Airdrop", function () {
  beforeEach(async () => {
    ;[owner, account1, account2, account3, account4, ...rest] = await ethers.getSigners()

    macroToken = (await (await ethers.getContractFactory("MacroToken")).deploy("Macro Token", "MACRO")) as MacroToken
    await macroToken.deployed()

    merkleHelper = (await (await ethers.getContractFactory("MerkleHelper")).deploy()) as MerkleHelper
    await merkleHelper.deployed()

    leafs.push(await merkleHelper.toLeafFormat(account1.address, ethers.utils.parseEther("1")))
    leafs.push(await merkleHelper.toLeafFormat(account2.address, ethers.utils.parseEther("2")))
    leafs.push(await merkleHelper.toLeafFormat(account3.address, ethers.utils.parseEther("3")))
    leafs.push(await merkleHelper.toLeafFormat(account4.address, ethers.utils.parseEther("4")))

    leafs.push(await merkleHelper.concat(leafs[0], leafs[1]))
    leafs.push(await merkleHelper.concat(leafs[2], leafs[3]))

    leafs.push(await merkleHelper.concat(leafs[4], leafs[5]))

    // TODO: The bytes32 value below is just a random hash in order to get the tests to pass.
    // You must create a merkle tree for testing, computes it root, then set it here
    merkleRoot = leafs[leafs.length - 1]
  })

  beforeEach(async () => {
    airdrop = await (await ethers.getContractFactory("Airdrop")).deploy(merkleRoot, owner.address, macroToken.address)
    await airdrop.deployed()
    await macroToken.connect(owner).mint(airdrop.address, ethers.utils.parseEther("5000"));

  })

  describe("setup and disabling ECDSA", () => {

    it("should deploy correctly", async () => {
      expect(macroToken.address).to.be.properAddress;
      expect(airdrop.address).to.be.properAddress;
    })

    it("should disable ECDSA verification", async () => {
      // first try with non-owner user
      await expect(airdrop.connect(account2).disableECDSAVerification()).to.be.revertedWith("Ownable: caller is not the owner")

      // now try with owner
      await expect(airdrop.connect(owner).disableECDSAVerification())
        .to.emit(airdrop, "ECDSADisabled")
        .withArgs(owner.address)
    })
  })

  describe("Merkle claiming", () => {
    it ("claimer can claim token", async () => {
      await airdrop.connect(account1).merkleClaim([leafs[1], leafs[5]], account1.address, ethers.utils.parseEther("1"), 0)
      expect(await macroToken.balanceOf(account1.address)).to.be.equal(ethers.utils.parseEther("1"))
    })

    it ("claimer can't claim invalid token", async () => {
      await expect(airdrop.connect(account1).merkleClaim([leafs[1], leafs[5]], account1.address, ethers.utils.parseEther("2"), 0)).to.be.revertedWith("invalid proof submitted")
      expect(await macroToken.balanceOf(account1.address)).to.be.equal(ethers.utils.parseEther("0"))
    })

    it("claimer can't claim token again", async () => {
      await airdrop.connect(account1).merkleClaim([leafs[1], leafs[5]], account1.address, ethers.utils.parseEther("1"), 0)
      expect(await macroToken.balanceOf(account1.address)).to.be.equal(ethers.utils.parseEther("1"))
      await expect(airdrop.connect(account1).merkleClaim([leafs[1], leafs[5]], account1.address, ethers.utils.parseEther("1"), 0)).to.be.revertedWith("already claimed")

    })
  })

  describe("Signature claiming", () => {
    it ("can claim using signature", async () => {

        const domain = {
            name: "Airdrop",
            version: "v1",
            chainId: await merkleHelper.chainId(),
            verifyingContract: airdrop.address,
          };

        const types = {
            Claim: [
              { name: "claimer", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          };
          const data = {
            claimer: rest[1].address,
            amount: ethers.utils.parseEther("1")
          }
          const signature = await owner._signTypedData(domain, types, data);
          expect(await airdrop.connect(rest[1]).signatureClaim(signature, rest[1].address, ethers.utils.parseEther("1"))).to.be.ok;
    })

    it ("can't claim again using signature", async () => {

        const domain = {
            name: "Airdrop",
            version: "v1",
            chainId: await merkleHelper.chainId(),
            verifyingContract: airdrop.address,
          };

        const types = {
            Claim: [
              { name: "claimer", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          };
          const data = {
            claimer: rest[1].address,
            amount: ethers.utils.parseEther("1")
          }
          const signature = await owner._signTypedData(domain, types, data);
          expect(await airdrop.connect(rest[1]).signatureClaim(signature, rest[1].address, ethers.utils.parseEther("1"))).to.be.ok;
          await expect( airdrop.connect(rest[1]).signatureClaim(signature, rest[1].address, ethers.utils.parseEther("1"))).to.be.revertedWith("already claimed");

        })

        it ("can't claim after ecdsa is disabled", async () => {

            const domain = {
                name: "Airdrop",
                version: "v1",
                chainId: await merkleHelper.chainId(),
                verifyingContract: airdrop.address,
              };
    
            const types = {
                Claim: [
                  { name: "claimer", type: "address" },
                  { name: "amount", type: "uint256" },
                ],
              };
              const data = {
                claimer: rest[1].address,
                amount: ethers.utils.parseEther("1")
              }
              await airdrop.connect(owner).disableECDSAVerification();
              const signature = await owner._signTypedData(domain, types, data);
              await expect( airdrop.connect(rest[1]).signatureClaim(signature, rest[1].address, ethers.utils.parseEther("1"))).to.be.revertedWith("SIGS_DISABLED");
    
            })
  })
})