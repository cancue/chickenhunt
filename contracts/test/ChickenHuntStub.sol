pragma solidity 0.4.24;

import "../ChickenHunt.sol";


/**
 * @title ChickenHuntStub for testing
 * @author M.H. Kang
 */
contract ChickenHuntStub is ChickenHunt {

  event Debug(string title, uint256 value);

  uint256 public dummyEther;

  function setGenesis() external {
    genesis = now;
  }

  function setStoreBalance(uint256 _value) external payable {
    store.balance = _value;
  }

  function setSavedChickenOf(address _user, uint256 _value) external {
    totalChicken += savedChickenOf[_user] > 0 ? _value - savedChickenOf[_user] : _value;
    savedChickenOf[_user] = _value;
  }

  function setAltarFundThousand() external {
    if (altarFund > 0) {
      dummyEther = 1000 - altarFund;
    }
    altarFund = 1000;
    dummyEther += 1000;
  }

  function setStats(
    address _user,
    uint256 _offensePower,
    uint256 _defensePower,
    uint256 _offenseMultiplier,
    uint256 _defenseMultiplier,
    uint256 _depots,
    uint256 _chicken
  ) external {
    House storage _house = _houseOf(_user);
    _house.huntingPower = 0;
    _house.offensePower = _offensePower;
    _house.defensePower = _defensePower;
    _house.offenseMultiplier = _offenseMultiplier;
    _house.defenseMultiplier = _defenseMultiplier;
    _house.depots = _depots;
    totalChicken += savedChickenOf[_user] > 0 ? _chicken - savedChickenOf[_user] : _chicken;
    savedChickenOf[_user] = _chicken;
  }

  function setForChicken(
    address _user,
    uint256 _chicken,
    uint256 _huntingPower,
    uint256 _huntingMultiplier
  ) public {
    House storage _house = houses[_user];
    _house.huntingPower = _huntingPower;
    _house.huntingMultiplier = _huntingMultiplier;
    savedChickenOf[_user] = _chicken;
    totalChicken += _chicken;
    lastSaveTime[msg.sender] = now;
  }

  function setEthereumBalance(
    address _user,
    uint256 _value
  ) public payable {
    _user.transfer(ethereumBalance[_user]);
    ethereumBalance[_user] = _value;
  }

  function setDevFee(uint256 _value) public {
    devFee = _value;
  }

  function getBalances() public view returns (uint256 _altarFund, uint256 _storeBalance, uint256 _devFee) {
    return (altarFund, store.balance, devFee);
  }

  function payChicken(address _user, uint256 _cost) public returns (uint256) {
    _payChicken(_user, _cost);
    uint256 _chicken = chickenOf(_user);
    require(savedChickenOf[_user] == _chicken);
    require(_unclaimedChickenOf(_user) == 0);
    return _chicken;
  }

  function payEthereumAndDistribute(uint256 _cost) public payable returns (bool) {
    _payEthereumAndDistribute(_cost);
    return true;
  }

  function setMax() public {
    uint256 _max = 0;
    _max -= 1;
    House storage _house = houses[msg.sender];
    _house.huntingPower = _max;
    _house.offensePower = _max;
    _house.defensePower = _max;
    _house.huntingMultiplier = _max;
    _house.offenseMultiplier = _max;
    _house.defenseMultiplier = _max;
    _house.hunter.strength = _max;
    _house.hunter.dexterity = _max;
    _house.hunter.constitution = _max;
    _house.hunter.resistance = _max;
    for (uint256 i = 0; i < 100; i++) {
      _house.pets.push(_max);
    }
    _house.depots = _max;
    savedChickenOf[msg.sender] = _max;
    lastSaveTime[msg.sender] = _max;
    attackCooldown[msg.sender] = _max;
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
      uint256 _income;
      (, , , , _income) = tradeBookOf(_users[i]);
      _totalEther -= _income;
    }

    _totalEther -= devFee;
    _totalEther -= altarFund;
    // _totalEther -= altarRecords[_getCurrentAltarRecordId()].ethereum;
    _totalEther -= store.balance;

    // should be zero
    return _totalShares + _totalChicken + _totalEther;
  }

  function debugCheckBalances(address[] _users) public returns (bool) {
    uint256 _totalShares = totalShares;
    uint256 _totalChicken = totalChicken;
    uint256 _totalEther = address(this).balance + dummyEther;

    emit Debug("shares", _totalShares);
    emit Debug("meat", _totalChicken);
    emit Debug("ether", _totalEther);

    for (uint256 i = 0; i < _users.length; i++) {
      _totalShares -= shares[_users[i]];
      _totalChicken -= savedChickenOf[_users[i]];
      _totalEther -= ethereumBalance[_users[i]];
      _totalEther -= dividendsOf(_users[i]);
      uint256 _income;
      (, , , , _income) = tradeBookOf(_users[i]);
      _totalEther -= _income;

      emit Debug("ushares", shares[_users[i]]);
      emit Debug("umeat", savedChickenOf[_users[i]]);
      emit Debug("uether", ethereumBalance[_users[i]]);
      emit Debug("udividends", dividendsOf(_users[i]));
      emit Debug("ualtarincome", _income);
    }

    _totalEther -= devFee;
    _totalEther -= altarFund;
    _totalEther -= altarRecords[_getCurrentAltarRecordId()].ethereum;
    _totalEther -= store.balance;

    emit Debug("dev", devFee);
    emit Debug("altar", altarFund);
    emit Debug("altareth", altarRecords[_getCurrentAltarRecordId()].ethereum);
    emit Debug("store", store.balance);

    emit Debug("ether", _totalEther);

    return _totalShares + _totalChicken + _totalEther == 0;
  }
}
