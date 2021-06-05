import { assert } from "chai";
import ether from "./helpers/ether";

const DappToken = artifacts.require("DappToken");
const DappTokenCrowdsale = artifacts.require("DappTokenCrowdsale");

require("chai").use(require("chai-as-promised")).should();

contract("DappTokenCrowdsale", ([_, wallet, investor1, investor2]) => {
  const name = "DappToken";
  const symbol = "DAPP";
  const decimals = 18;
  const rate = 500;
  let token;
  let crowdsale;

  before(async () => {
    token = await DappToken.deployed(name, symbol, decimals);
    crowdsale = await DappTokenCrowdsale.new(rate, wallet, token.address);

    // Transfer token ownership to crowdsale
    await token.addMinter(crowdsale.address);
  });

  describe("crowdsale", () => {
    let result;

    it("tracks the rate", async () => {
      result = await crowdsale.rate();
      result.toNumber().should.equal(rate);
    });

    it("tracks the wallet", async () => {
      result = await crowdsale.wallet();
      result.should.equal(wallet);
    });

    it("tracks the token", async () => {
      result = await crowdsale.token();
      result.should.equal(token.address);
    });
  });

  describe("minted crowdsale", () => {
    it("mints tokens after purchase", async () => {
      const originalTotalSupply = await token.totalSupply();
      await crowdsale.sendTransaction({ value: ether(1), from: investor1 });
      const newTotalSupply = await token.totalSupply();
      assert.isTrue(newTotalSupply > originalTotalSupply);
    });
  });

  describe("accepting payments", () => {
    it("should accept payments", async () => {
      const value = ether(1);
      const purchaser = investor2;
      await crowdsale.sendTransaction({ value: value, from: investor1 }).should
        .be.fulfilled;
      await crowdsale.buyTokens(investor1, { value: value, from: purchaser })
        .should.be.fulfilled;
    });
  });
});
