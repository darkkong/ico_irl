// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";

contract DappTokenCrowdsale is Crowdsale, MintedCrowdsale {
  constructor(
    uint256 _rate,
    address payable _wallet,
    IERC20 _token
  ) public Crowdsale(_rate, _wallet, _token) {}
}
