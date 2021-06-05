const DappToken = artifacts.require("DappToken");

module.exports = async (deployer) => {
  const _name = "Dapp Token";
  const _symbol = "DAPP";
  const _decimals = 18;

  await deployer.deploy(DappToken, _name, _symbol, _decimals);
};
