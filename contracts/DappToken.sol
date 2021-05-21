// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract DappToken is ERC20, ERC20Detailed {
  constructor(
    string memory _name,
    string memory _symbol,
    uint8 _decimals
  ) public ERC20Detailed(_name, _symbol, _decimals) {}
}
