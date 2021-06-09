// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Pausable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/TokenTimelock.sol";
import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/WhitelistCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/RefundableCrowdsale.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract DappTokenCrowdsale is
  Crowdsale,
  MintedCrowdsale,
  CappedCrowdsale,
  TimedCrowdsale,
  WhitelistCrowdsale,
  RefundableCrowdsale,
  Ownable
{
  // Track investor contribution
  uint256 public investorMinCap = 2000000000000000; // Minimum investor contribution - 0.002 Ether
  uint256 public investorHardCap = 50000000000000000000; // Maximum investor contribution - 50 Ether
  mapping(address => uint256) public contributions;

  // Crowdsale Stages
  enum CrowdsaleStage { PreICO, ICO }
  // Default to presale stage
  CrowdsaleStage public stage = CrowdsaleStage.PreICO;

  // Token Distribution
  uint256 public tokenSalePercentage = 70;
  uint256 public foundersPercentage = 10;
  uint256 public foundationPercentage = 10;
  uint256 public partnersPercentage = 10;

  // Token reserve funds
  address public foundersFund;
  address public foundationFund;
  address public partnersFund;

  // Token time lock
  uint256 public releaseTime;
  TokenTimelock public foundersTimelock;
  TokenTimelock public foundationTimelock;
  TokenTimelock public partnersTimelock;

  constructor(
    uint256 _rate,
    address payable _wallet,
    IERC20 _token,
    uint256 _cap,
    uint256 _openingTime,
    uint256 _closingTime,
    uint256 _goal,
    address _foundersFund,
    address _foundationFund,
    address _partnersFund,
    uint256 _releaseTime
  )
    public
    Crowdsale(_rate, _wallet, _token)
    CappedCrowdsale(_cap)
    TimedCrowdsale(_openingTime, _closingTime)
    RefundableCrowdsale(_goal)
  {
    require(_goal <= _cap);
    foundersFund = _foundersFund;
    foundationFund = _foundationFund;
    partnersFund = _partnersFund;
    releaseTime = _releaseTime;
  }

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
   * @dev Allows admin to update the crowdsale stage
   * @param _stage Crowdsale stage
   */
  function setCrowdsaleStage(uint256 _stage) public onlyOwner {
    if (uint256(CrowdsaleStage.PreICO) == _stage) {
      stage = CrowdsaleStage.PreICO;
    } else if (uint256(CrowdsaleStage.ICO) == _stage) {
      stage = CrowdsaleStage.ICO;
    }

    if (stage == CrowdsaleStage.PreICO) {
      _setRate(500);
    } else if (stage == CrowdsaleStage.ICO) {
      _setRate(250);
    }
  }

  /**
   * @dev forwards funds to the wallet during the PreICO stage, then the refund escrow during ICO stage
   */
  function _forwardFunds() internal {
    if (stage == CrowdsaleStage.PreICO) {
      wallet().transfer(msg.value);
    } else if (stage == CrowdsaleStage.ICO) {
      super._forwardFunds();
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

  /**
   * @dev enables token transfers, called when owner calls finalize()
   */
  function _finalization() internal {
    if (goalReached()) {
      ERC20Mintable _mintableToken = ERC20Mintable(address(token()));
      uint256 _alreadyMinted = _mintableToken.totalSupply();

      uint256 _finalTotalSupply =
        _alreadyMinted.div(tokenSalePercentage).mul(100);

      foundersTimelock = new TokenTimelock(token(), foundersFund, releaseTime);
      foundationTimelock = new TokenTimelock(
        token(),
        foundationFund,
        releaseTime
      );
      partnersTimelock = new TokenTimelock(token(), partnersFund, releaseTime);

      _mintableToken.mint(
        address(foundersTimelock),
        _finalTotalSupply.div(foundersPercentage)
      );
      _mintableToken.mint(
        address(foundationTimelock),
        _finalTotalSupply.div(foundationPercentage)
      );
      _mintableToken.mint(
        address(partnersTimelock),
        _finalTotalSupply.div(partnersPercentage)
      );

      _mintableToken.renounceMinter();
      // Unpause the token
      ERC20Pausable _pausableToken = ERC20Pausable(address(token()));
      _pausableToken.unpause();
      _pausableToken.renouncePauser();
    }

    super._finalization();
  }
}
