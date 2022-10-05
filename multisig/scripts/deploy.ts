import { Logic } from "./../typechain-types/contracts/Logic";
import hre, { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const Logic = await ethers.getContractFactory("Logic");
  const logic = await Logic.deploy();
  await logic.deployed();
  console.log("logic deployed to", logic.address);

  const Proxy = await ethers.getContractFactory("Proxy");
  const proxy = await Proxy.deploy(logic.address);
  await proxy.deployed();
  console.log("proxy deployed to", proxy.address);

  const LogicImproved = await ethers.getContractFactory("LogicImproved");
  const logicImproved = await LogicImproved.deploy();
  await logicImproved.deployed();
  console.log("logicImproved deployed to", logicImproved.address);

  const logic1 = Logic.attach(proxy.address) as Logic;
  const tx = await logic1.initialize(1);
  await tx.wait();

  // gnosis safe address
  await logic1
    .connect(deployer)
    .transferOwnership("0x1B705ac8177539Fd46f35B47767e6D846690D056");

  await logicImproved.deployTransaction.wait(5);

  await hre.run("verify:verify", {
    address: logic.address,
    constructorArguments: [],
  });

  await hre.run("verify:verify", {
    address: proxy.address,
    constructorArguments: [logic.address],
  });

  await hre.run("verify:verify", {
    address: logicImproved.address,
    constructorArguments: [],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
