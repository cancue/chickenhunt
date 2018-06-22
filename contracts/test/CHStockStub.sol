pragma solidity 0.4.24;

import "../ChickenHunt.sol";


/**
 * @title CHStockStub for testing
 * @author M.H. Kang
 */
contract CHStockStub is ChickenHunt {

  event Debug(string title, uint256 index, uint256 value);

  uint256 public totalSupplyRecorded;
  uint256 public totalDividends;
  uint256 public dummyEther;

  function recordTotalSupply() public {
    totalSupplyRecorded = totalShares;
  }

  function redeemSharesAndRecord() public {
    totalDividends += dividendsOf(msg.sender);
    redeemShares();
  }

  function getDividendsGap() public view returns (int256) {
    require(totalSupplyRecorded == uint256(int256(totalSupplyRecorded)));
    require(totalDividends == uint256(int256(totalDividends)));

    return int256(totalSupplyRecorded) - int256(totalDividends);
  }

  function giveShares(address _user, uint256 _wei) public {
    _giveShares(_user, _wei);
    dummyEther += _wei;
  }

  function checkBalances(address[] _users) public view returns (uint256) {
    uint256 _totalShares = totalShares;
    uint256 _totalChicken = totalChicken;
    uint256 _totalEther = address(this).balance + dummyEther;

    for (uint256 i = 0; i < _users.length; i++) {
      _totalShares -= shares[_users[i]];
      _totalChicken -= savedChickenOf[_users[i]];
      _totalEther -= ethereumBalance[_users[i]];
      _totalEther -= dividendsOf(_users[i]);
    }

    _totalEther -= devFee;
    _totalEther -= altarFund;
    _totalEther -= altarRecords[_getCurrentAltarRecordId()].ethereum;
    _totalEther -= store.balance;

    // should be zero
    return _totalShares + _totalChicken + _totalEther;
  }

}
