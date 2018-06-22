async function assertRevert (promise) {
  try {
    await promise
    assert.fail('Expected revert not received')
  } catch (error) {
    const revertFound = error.message.search('revert') >= 0
    assert(revertFound, `Expected "revert", got ${error} instead`)
  }
}

// modified from https://github.com/OpenZeppelin/openzeppelin-solidity.git
function increaseTime (seconds) {
  const id = Date.now()

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [seconds],
      id: id
    }, err1 => {
      if (err1) return reject(err1)

      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id + 1
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res)
      })
    })
  })
}

module.exports = {
  nullAddress: '0x0000000000000000000000000000000000000000',
  assertRevert: assertRevert,
  increaseTime: increaseTime,
  uint256Max: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
  uint32Max: '4294967295',
  uint16Max: '65535'
}
