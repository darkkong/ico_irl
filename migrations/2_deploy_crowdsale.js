const DappToken = artifacts.require("DappToken");
const DappTokenCrowdsale = artifacts.require("DappTokenCrowdsale");

const ether = (n) =>
  new web3.utils.toBN(web3.utils.toWei(n.toString()), "ether");

const duration = {
  seconds: function (val) {
    return val;
  },
  minutes: function (val) {
    return val * this.seconds(60);
  },
  hours: function (val) {
    return val * this.minutes(60);
  },
  days: function (val) {
    return val * this.hours(24);
  },
  weeks: function (val) {
    return val * this.days(7);
  },
  years: function (val) {
    return val * this.days(365);
  },
};

module.exports = async (deployer, network, accounts) => {
  const _name = "Dapp Token";
  const _symbol = "DAPP";
  const _decimals = 18;

  await deployer.deploy(DappToken, _name, _symbol, _decimals);
  const deployedToken = await DappToken.deployed();

  const latestTime = new Date().getTime();

  const _rate = 500;
  const _wallet = accounts[0];
  const _token = deployedToken.address;
  const _cap = ether(100);
  const _openingTime = latestTime + duration.minutes(1);
  const _closingTime = _openingTime + duration.weeks(1);
  const _goal = ether(50);
  const _foundersFund = accounts[0];
  const _foundationFund = accounts[0];
  const _partnersFund = accounts[0];
  const _releaseTime = _closingTime + duration.days(1);

  await deployer.deploy(
    DappTokenCrowdsale,
    _rate,
    _wallet,
    _token,
    _cap,
    _openingTime,
    _closingTime,
    _goal,
    _foundersFund,
    _foundationFund,
    _partnersFund,
    _releaseTime
  );

  return true;
};
