// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/WhitelistCrowdsale.sol";

contract DappTokenCrowdsale is
  Crowdsale,
  MintedCrowdsale,
  CappedCrowdsale,
  TimedCrowdsale,
  WhitelistCrowdsale
{
  // Track investor contribution
  uint256 public investorMinCap = 2000000000000000; // Minimum investor contribution - 0.002 Ether
  uint256 public investorHardCap = 50000000000000000000; // Maximum investor contribution - 50 Ether
  mapping(address => uint256) public contributions;

  constructor(
    uint256 _rate,
    address payable _wallet,
    IERC20 _token,
    uint256 _cap,
    uint256 _openingTime,
    uint256 _closingTime
  )
    public
    Crowdsale(_rate, _wallet, _token)
    CappedCrowdsale(_cap)
    TimedCrowdsale(_openingTime, _closingTime)
  {}

  /**
   * @dev Returns the amount contributed so far by a specific user.
   * @param _beneficiary Address of contributor
   * @return User contribution so far
   */
  function getUserContribution(address _beneficiary)
    public
    view
    returns (uint256)
  {
    return contributions[_beneficiary];
  }

  function addAddressesWhitelisted(address[] memory _accounts)
    public
    onlyWhitelistAdmin
  {
    for (uint256 i = 0; i < _accounts.length; i++) {
      addWhitelisted(_accounts[i]);
    }
  }

  /**
   * @dev Extend parent behavior requiring purchase to respect inveestor min/max funding cap.
   * @param _beneficiary Token purchaser
   * @param _weiAmount Amount of wei contributed
   */
  function _preValidatePurchase(address _beneficiary, uint256 _weiAmount)
    internal
    view
  {
    super._preValidatePurchase(_beneficiary, _weiAmount);
    uint256 _existingContribution = contributions[_beneficiary];
    uint256 _newContribution = _existingContribution.add(_weiAmount);
    require(
      _newContribution >= investorMinCap && _newContribution <= investorHardCap
    );
  }

  function _updatePurchasingState(address _beneficiary, uint256 _weiAmount)
    internal
  {
    super._updatePurchasingState(_beneficiary, _weiAmount);
    uint256 _existingContribution = contributions[_beneficiary];
    uint256 _newContribution = _existingContribution.add(_weiAmount);
    contributions[_beneficiary] = _newContribution;
  }
}
