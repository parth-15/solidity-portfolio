import hre, { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = "0x0471C37af7C17f880BCAA81A47AF9eDBe2f28F26";

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const ICO = await ethers.getContractFactory("ICO");
  const ico = await ICO.deploy(treasury);
  await ico.deployTransaction.wait(1);

  const SPACELP = await ethers.getContractFactory("SpaceLP");
  const spaceLP = await SPACELP.deploy(await ico.SPC_TOKEN_ADDRESS());
  await spaceLP.deployTransaction.wait(1);

  const SPACEROUTER = await ethers.getContractFactory("SpaceRouter");
  const spaceRouter = await SPACEROUTER.deploy(
    spaceLP.address,
    await ico.SPC_TOKEN_ADDRESS()
  );
  await spaceRouter.deployTransaction.wait(1);

  console.log("ico address:", ico.address);
  console.log("spacecoin address", await ico.SPC_TOKEN_ADDRESS());
  console.log("spaceLP address", spaceLP.address);
  console.log("spaceRouter address", spaceRouter.address);

  await ico.deployTransaction.wait(5);
  await spaceLP.deployTransaction.wait(5);
  await spaceRouter.deployTransaction.wait(5);

  await hre.run("verify:verify", {
    address: ico.address,
    constructorArguments: [treasury],
  });

  await hre.run("verify:verify", {
    address: await ico.SPC_TOKEN_ADDRESS(),
    constructorArguments: [deployer.address, treasury, ico.address],
  });

  await hre.run("verify:verify", {
    address: spaceLP.address,
    constructorArguments: [await ico.SPC_TOKEN_ADDRESS()],
  });

  await hre.run("verify:verify", {
    address: spaceRouter.address,
    constructorArguments: [spaceLP.address, await ico.SPC_TOKEN_ADDRESS()],
  });
}

// spacecoin address 0x18cc75F62Dc72308faa386b9B802B97a57603aD6

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
