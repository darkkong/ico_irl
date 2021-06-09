import ether from "./helpers/ether";
import EVMRevert from "./helpers/EVMRevert";
import { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";

const DappToken = artifacts.require("DappToken");
const DappTokenCrowdsale = artifacts.require("DappTokenCrowdsale");

require("chai").use(require("chai-as-promised")).should();

contract("DappTokenCrowdsale", ([_, wallet, investor1, investor2]) => {
  const name = "DappToken";
  const symbol = "DAPP";
  const decimals = 18;

  // Crowdsale config
  const rate = 500;
  const cap = ether(100);
  const goal = ether(50);

  // Investor caps
  const investorMinCap = ether(0.002);
  const investorHardCap = ether(50);

  // ICO Stages
  const preIcoStage = 0;
  const preIcoRate = 500;
  const icoStage = 1;
  const icoRate = 250;

  let token, crowdsale, openingTime, closingTime;

  beforeEach(async () => {
    openingTime = (await latestTime()) + duration.weeks(1);
    closingTime = openingTime + duration.weeks(1);

    token = await DappToken.deployed(name, symbol, decimals);
    crowdsale = await DappTokenCrowdsale.new(
      rate,
      wallet,
      token.address,
      cap,
      openingTime,
      closingTime,
      goal
    );

    // Add token minter role to crowdsale
    await token.addMinter(crowdsale.address);

    // Add investors to whitelist
    await crowdsale.addAddressesWhitelisted([investor1, investor2]);

    // Advance time to crowdsale start
    await increaseTimeTo(openingTime + 1);
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

  describe("capped crowdsale", () => {
    let result;
    it("has the correct hard cap", async () => {
      result = await crowdsale.cap();
      result.toString().should.equal(cap.toString());
    });
  });

  describe("timed crowdsale", () => {
    it("is open", async () => {
      const isClosed = await crowdsale.hasClosed();
      isClosed.should.be.false;
    });
  });

  describe("whitelisted crowdsale", () => {
    it("rejects contributions from non-whitelisted investors", async () => {
      const notWhitelisted = _;
      await crowdsale
        .buyTokens(notWhitelisted, { value: ether(1), from: notWhitelisted })
        .should.be.rejectedWith(EVMRevert);
    });
  });

  describe("refundable crowdsale", () => {
    beforeEach(async () => {
      await crowdsale.buyTokens(investor1, {
        value: ether(1),
        from: investor1,
      });
    });

    describe("during crowdsale", () => {
      it("prevents the investor from claiming refund", async () => {
        await crowdsale
          .claimRefund(investor1, { from: investor1 })
          .should.be.rejectedWith(EVMRevert);
      });
    });

    describe("when the crowdsale stage is PreICO", () => {
      beforeEach(async () => {
        // Crowdsale stage is already PreICO by default
        await crowdsale.buyTokens(investor1, {
          value: ether(1),
          from: investor1,
        });
      });

      it("forwards funds to the wallet", async () => {
        const balance = await web3.eth.getBalance(wallet);
        expect(web3.utils.toBN(balance).gt(ether(100))).to.be.true;
      });
    });

    describe("when the crowdsale stage is ICO", () => {
      beforeEach(async () => {
        await crowdsale.setCrowdsaleStage(icoStage, { from: _ });
        await crowdsale.buyTokens(investor1, {
          value: ether(1),
          from: investor1,
        });
      });

      it("forwards funds to the refund escrow", async () => {
        const escrowAddress = await crowdsale.escrow();
        const balance = await web3.eth.getBalance(escrowAddress);
        expect(web3.utils.toBN(balance).gt(0)).to.be.true;
      });
    });
  });

  describe("crowdsale stages", () => {
    it("it starts in PreICO", async () => {
      const stage = await crowdsale.stage();
      stage.toNumber().should.equal(preIcoStage);
    });

    it("starts at the preICO rate", async () => {
      const result = await crowdsale.rate();
      result.toNumber().should.equal(preIcoRate);
    });

    it("allows admin to update the stage & rate", async () => {
      await crowdsale.setCrowdsaleStage(icoStage, { from: _ });
      const stage = await crowdsale.stage();
      stage.toNumber().should.equal(icoStage);
      const result = await crowdsale.rate();
      result.toNumber().should.equal(icoRate);
    });

    it("prevents non-admin from updating the stage", async () => {
      await crowdsale
        .setCrowdsaleStage(icoStage, { from: investor1 })
        .should.be.rejectedWith(EVMRevert);
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

  describe("buyTokens()", () => {
    describe("when the contribution is less than the minimum cap", () => {
      it("rejects the transaction", async () => {
        const value = investorMinCap - 1;
        await crowdsale
          .buyTokens(investor2, { value: value, from: investor2 })
          .should.be.rejectedWith(EVMRevert);
      });
    });

    describe("when the investor has already met the minimum cap", () => {
      it("allows the investor to contribute below the minimum cap", async () => {
        // First contribution is valid
        const value1 = ether(1);
        await crowdsale.buyTokens(investor1, {
          value: value1,
          from: investor1,
        });
        // Second contribution is less than investor cap
        const value2 = 1; // wei
        await crowdsale.buyTokens(investor1, { value: value2, from: investor1 })
          .should.be.fulfilled;
      });
    });

    describe("when the total contributions exceed the investor hard cap", () => {
      it("rejects the transaction", async () => {
        // First contribution is in valid range
        const value1 = ether(2);
        await crowdsale.buyTokens(investor1, {
          value: value1,
          from: investor1,
        });
        // Second contribution sends total contributions over investor hard cap
        const value2 = ether(49);
        await crowdsale
          .buyTokens(investor1, { value: value2, from: investor1 })
          .should.be.rejectedWith(EVMRevert);
      });
    });

    describe("when the contribution is within the valid range", () => {
      const value = ether(2);
      it("suceeds & updates the contribution amount", async () => {
        await crowdsale.buyTokens(investor2, { value: value, from: investor2 })
          .should.be.fulfilled;
        const contribution = await crowdsale.getUserContribution(investor2);
        contribution.toString().should.equal(value.toString());
      });
    });
  });
});
