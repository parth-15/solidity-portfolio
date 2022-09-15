import hre, { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = "0xa00efcd04c6bc0749ce21e753ade3e3e80c02c3b";

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const ICO = await ethers.getContractFactory("ICO");
  const ico = await ICO.deploy(treasury);

  console.log("ico address:", ico.address);
  console.log("spacecoin address", await ico.SPC_TOKEN_ADDRESS());

  await ico.deployTransaction.wait(5);

  await hre.run("verify:verify", {
    address: ico.address,
    constructorArguments: [treasury],
  });

  await hre.run("verify:verify", {
    address: await ico.SPC_TOKEN_ADDRESS(),
    constructorArguments: [deployer.address, treasury, ico.address],
  });
}

// spacecoin address 0x18cc75F62Dc72308faa386b9B802B97a57603aD6

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
