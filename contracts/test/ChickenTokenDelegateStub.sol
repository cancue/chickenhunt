pragma solidity 0.4.24;


/**
 * @title ChickenTokenDelegateStub
 * @author M.H. Kang
 */
contract ChickenTokenDelegateStub {

  struct Values {
    bool transferResult;
    uint256 saveChickenOf;
    uint256 totalChicken;
    uint256 chickenOf;
  }

  Values public dummy;

  function setValues(
    bool _transferResult,
    uint256 _saveChickenOf,
    uint256 _totalChicken,
    uint256 _chickenOf
  )
    external
  {
    dummy = Values(_transferResult, _saveChickenOf, _totalChicken, _chickenOf);
  }

  function saveChickenOf(address _owner) external view returns (uint256) {
    _owner;
    return dummy.saveChickenOf;
  }
  function transferChickenFrom(address _from, address _to, uint256 _value) external view returns (bool) {
    _from;
    _to;
    _value;
    return dummy.transferResult;
  }
  function totalChicken() external view returns (uint256) {
    return dummy.totalChicken;
  }
  function chickenOf(address _owner) external view returns (uint256) {
    _owner;
    return dummy.chickenOf;
  }

}
