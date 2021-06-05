require("chai").should();

const DappToken = artifacts.require("DappToken");

contract("DappToken", (accounts) => {
  const _name = "Dapp Token";
  const _symbol = "DAPP";
  const _decimals = 18;

  beforeEach(async () => {
    this.token = await DappToken.new(_name, _symbol, _decimals);
  });

  describe("token attributes", () => {
    it("has the correct name", async () => {
      const name = await this.token.name();
      name.should.equal(_name);
    });

    it("has the correct symbol", async () => {
      const symbol = await this.token.symbol();
      symbol.should.equal(_symbol);
    });

    it("has the correct decimals", async () => {
      const decimals = await this.token.decimals();
      decimals.toNumber().should.equal(_decimals);
    });
  });
});
