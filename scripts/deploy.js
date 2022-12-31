// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {

  const Nft = await hre.ethers.getContractFactory("NFT");
  const nft = await Nft.deploy();

  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(2);

  await nft.deployed();
  
  await marketplace.deployed();

  const [deployer] = await hre.ethers.getSigners();

  console.log(
    `Account Address: ${deployer.address}`
  );
  console.log(
    `Account Address: ${(await deployer.getBalance()).toString()}`
  );

  console.log(
    `Nft Contract Deployed: ${(await nft.address)}`
  );

  console.log(
    `Marketplace Contract Deployed: ${marketplace.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});