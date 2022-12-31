// const {
//   time,
//   loadFixture,
// } = require("@nomicfoundation/hardhat-network-helpers");
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

const toWei = (num) => ethers.utils.parseEther(num.toString())
const fromWei = (num) => ethers.utils.formatEther(num)

describe("Nftmarketplace", async function () {

  let deployer, addr1, addr2, nft, marketplace;
  let feePercent = 2;
  let URI = "Test URI";

  beforeEach(async function () {
    const Nft = await ethers.getContractFactory("NFT");
    const Marketplace = await ethers.getContractFactory("Marketplace");

    [deployer, addr1, addr2] = await ethers.getSigners()

    nft = await Nft.deploy();
    marketplace = await Marketplace.deploy(feePercent);

  })

  describe("Deployment", function () {
    it("Should track name and symbol of the nft collection", async function () {
      expect(await nft.name()).to.equal("Nolan Misteries")
      expect(await nft.symbol()).to.equal("NOM")
    })

    it("Should track Fee amount and fee account", async function () {
      expect(await marketplace.feeAccount()).to.equal(deployer.address)
      expect(await marketplace.feePercent()).to.equal(feePercent)
    })
  })

  describe("Mint NFT", function () {
    it("Should track each minted NFT", async () => {
      // addr1 mint an nft
      await nft.connect(addr1).mint(URI);
      expect(await nft.tokenCount()).to.equal(1);
      expect(await nft.balanceOf(addr1.address)).to.equal(1)
      expect(await nft.tokenURI(1)).to.equal(URI);
      // addr2 mint an nft
      await nft.connect(addr2).mint(URI);
      expect(await nft.tokenCount()).to.equal(2);
      expect(await nft.balanceOf(addr2.address)).to.equal(1)
      expect(await nft.tokenURI(2)).to.equal(URI);
    })
  })

  describe("List item in market place", function () {
    beforeEach(async function () {
      //addr1 mints an nft
      await nft.connect(addr1).mint(URI);
      //addr1 approves market place to spend nft
      await nft.connect(addr1).setApprovalForAll(marketplace.address, true)

    })
    it("Should offer their nft from seller to marketplace and emit offered event", async () => {
      //addr1 offers their nft at a price of 1 ether
      await expect(marketplace.connect(addr1).makeItem(nft.address, 1, toWei(1)))
        .to.emit(marketplace, "Offered")
        .withArgs(
          1, nft.address, 1, toWei(1), addr1.address
        )

        //Owner of nft should now be the marketplace
        expect(await nft.ownerOf(1)).to.equal(marketplace.address)
        //Get itrem from the items mapping then check fields to ensure they are correct
        const item = await marketplace.items(1)
        expect(item.itemId).to.equal(1)
        expect(item.nft).to.equal(nft.address)
        expect(item.tokenId).to.equal(1)
        expect(item.price).to.equal(toWei(1))
        expect(item.sold).to.equal(false)
    })

    it("Should fail if price is equal to zero", async () => {
      await expect(marketplace.connect(addr1).makeItem(nft.address, 1, 0))
      .to.be.revertedWith("Price must be greater than zero");
    })

  })

  describe("Purchasing marketplace items", function () {
    //
    let price = 2
    let totalPriceInWei
    beforeEach(async function () {
      //addr1 mints an nft
      await nft.connect(addr1).mint(URI);
      //addr1 approves market place to spend nft
      await nft.connect(addr1).setApprovalForAll(marketplace.address, true)
      //addr1 lists there nft in market place
      await marketplace.connect(addr1).makeItem(nft.address, 1, toWei(price))
    })

    it("Should update items as sold, pay seller, transfer NFT to buyer, charge fees and emit a Bought Event", async () => {
      const sellerInitialEthBal = await addr1.getBalance()
      const feeAccountInitialEthBal = await deployer.getBalance()
      //fetch items price (item price + fee)
      totalPriceInWei = await marketplace.getTotalPrice(1);
      // addr 2 purchase item
      await expect(marketplace.connect(addr2).purchaseItem(1, {value: totalPriceInWei}))
        .to.emit(marketplace, "Bought")
        .withArgs(
          1, nft.address, 1, toWei(price), addr1.address, addr2.address
        )
      // get current eth balance
      const sellerFinalEthBal = await addr1.getBalance()
      const feeAccountFinalEthBal = await deployer.getBalance()
      //seller should receive payment for the price of the NFT sold
      expect(+fromWei(sellerFinalEthBal)).to.equal(+price + +fromWei(sellerInitialEthBal));
      //Calculate fee
      const fee = (feePercent / 100) * price
      //feeAccount should receive fee
      // expect(+fromWei(feeAccountFinalEthBal)).to.equal(+fee + +fromWei(feeAccountInitialEthBal));
      // The buyer should now own the nft
      expect(await nft.ownerOf(1)).to.equal(addr2.address)
      //item should be marked as sold
      expect((await marketplace.items(1)).sold).to.equal(true)
    })

    it("should fail for invalid item ids, sold items and when not enough ether is paid ", async () => {
      // fail for invalid ID
      await expect(
        marketplace.connect(addr2).purchaseItem(2, {value: totalPriceInWei})
      ).to.be.revertedWith("Item does not exist");
      await expect(
        marketplace.connect(addr2).purchaseItem(0, {value: totalPriceInWei})
      ).to.be.revertedWith("Item does not exist");
      //fails when not enough ether is paid with the transaction
      await expect(
        marketplace.connect(addr2).purchaseItem(1, {value: toWei(price)})
      ).to.be.revertedWith("Not enough ether to cover item price and market fee");
      //addr2 purchases item
      await marketplace.connect(addr2).purchaseItem(1, {value: totalPriceInWei})
      // deployer tries to purchase item 1 after its been sold
      await expect(marketplace.connect(deployer).purchaseItem(1, {value: totalPriceInWei}))
      .to.be.revertedWith("Item already sold")
    })
  })

});
