const CHStockStub = artifacts.require('./test/CHStockStub.sol')
const BigNumber = require('bignumber.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

/**********************/
/** SHOULD SET SIZE! **/
/**/ const size = 1 /**/
/**********************/
/**********************/

const correction = BigNumber(2).pow(64)
const maxWei = 1000000000000000000 // 1 ether
const minWei = 10000000000000 // 0.00001 ether
const unit = maxWei / minWei
const weiToEther = BigNumber(10).pow(18)
let subject
let users
let done = 0
let total = BigNumber(0)
let pps = BigNumber(0)
let shares
let deduction

contract('Stock Scalability', (accounts) => {
  before(async () => {
    subject = await CHStockStub.new()
    users = accounts
    shares = new Array(users.length).fill(BigNumber(0))
    deduction = new Array(users.length).fill(BigNumber(0))

    // set size
    await Promise.all(
      new Array(size).fill(0).map(() => {
        let _index = Math.floor(Math.random() * (users.length - 1))
        return randGive(_index)
      })
    )
  })

  after(async () => {
    const checksum = await subject.checkBalances.call(users)
    // shares division error
    checksum.should.be.bignumber.most(1000000)
    console.log('checksum: ' + checksum)
  })

  it('report marginal giveShares dividends', async () => {
    const lastIndex = users.length - 1
    await give(lastIndex, minWei)
    const dividends = await subject.dividendsOf(users[lastIndex])
    console.log(`last user min dividends: ${dividends} wei`)
    dividends.minus(BigNumber(minWei).pow(2).div(total).integerValue())
      .should.be.bignumber.most(1)
  })

  it('report total', async () => {
    // check total
    await subject.recordTotalSupply()
    const totalSupply = (await subject.totalSupply())
    console.log(`total: ${BigNumber(totalSupply).div(weiToEther)} ether`)
  })

  it('should work with dividends and redeemShares', async () => {
    // check dividends & redeemShares remains test
    let _plus = 0
    let _minus = 0
    for (let i = 0; i < users.length; i++) {
      if (shares[i].isGreaterThan(0)) {
        let { logs } = await subject.redeemSharesAndRecord({ from: users[i] })
        let _dividends = logs[0].args.dividends

        let _gap = pps.times(shares[i]).minus(deduction[i]).div(correction)
          .integerValue().minus(_dividends)
        let _profit = _dividends.minus(shares[i])

        console.log(`#${i} shares: ${shares[i].div(weiToEther).toFixed(2)} profit: ${_profit.div(weiToEther).toFixed(2)} (${_profit.times(100).div(shares[i]).toFixed(4)}%) (gap: ${_gap})`)
        if (_profit > 0) {
          _plus++
        } else if (_profit < 0) {
          _minus++
        }
      }
    }
    console.log(`plus: ${_plus}, minus: ${_minus}`)

    let _remains = await subject.getDividendsGap.call()
    console.log(`remains: ${_remains}`)
  })
})

async function randGive (index) {
  let _amount = Math.floor(Math.random() * unit + 1) * minWei
  await give(index, _amount)
  done += 1
  if (done % 10 === 0) {
    console.log(`${done} / ${size} done (${(100 * done / size).toFixed(2)}%)`)
  }
}

async function give (index, _amount) {
  shares[index] = shares[index].plus(_amount)
  deduction[index] = deduction[index].plus(pps.times(_amount))
  total = total.plus(_amount)
  pps = pps.plus(correction.times(_amount).div(total))

  await subject.giveShares(users[index], _amount)
}
