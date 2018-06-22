const ChickenHuntStub = artifacts.require('./test/ChickenHuntStub.sol')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

const store = {
  cut: 1,
  cost: 100000000000000000,
  balance: 198700000000000000
}

contract('Store', ([committee, secondOwner]) => {
  let subject

  before(async () => {
    subject = await ChickenHuntStub.new()
    subject.init(committee)
    await subject.setStoreBalance(store.balance, { value: store.balance })
  })

  afterEach(async () => {
    const checksum = await subject.checkBalances.call([
      committee, secondOwner
    ])
    checksum.should.be.bignumber.equal(0)
  })

  describe('store', () => {
    it('should work', async () => {
      const res = await subject.store.call()
      assert.equal(res[0], committee)
      assert.equal(res[1], store.cut)
      assert.equal(res[2], store.cost)
      assert.equal(res[3], store.balance)
    })
  })

  describe('buyStore', () => {
    const from = committee
    const to = secondOwner
    const price = store.cost * 1.2
    let logs

    before(async () => {
      logs = (await subject.buyStore({ from: to, value: price })).logs
    })

    it('should emit events', () => {
      logs.should.be.lengthOf(1)
      logs[0].event.should.be.equal('BuyStore')
      logs[0].args.from.should.be.equal(from)
      logs[0].args.to.should.be.equal(to)
      logs[0].args.cost.should.be.bignumber.equal(price)
    })

    it('should change the store info', async () => {
      const _store = await subject.store.call()
      assert.equal(_store[0], to)
      assert.equal(_store[1], store.cut)
      assert.equal(_store[2], price)
      assert.equal(_store[3], 0)
    })

    it('should change balances', async () => {
      const balance = await subject.ethereumBalance.call(from)
      assert.equal(balance.toNumber(), store.cost * 1.1 + store.balance)
      const devFee = await subject.devFee.call()
      assert.equal(devFee, store.cost * 0.1)
      const altarFund = await subject.altarFund.call()
      assert.equal(altarFund, 0)
      const totalShare = await subject.totalSupply.call()
      assert.equal(totalShare, 0)
    })
  })

  describe('withdraw', () => {
    const profit = 2456345

    before(async () => {
      await subject.setStoreBalance(profit, { value: profit })
      const _store = await subject.store.call()
      assert.equal(_store[3].toNumber(), profit)
      const balance = await subject.ethereumBalance(secondOwner)
      assert.equal(balance, 0)
    })

    it('should work by anyone', async () => {
      await subject.withdrawStoreBalance()
      const balance = await subject.ethereumBalance(secondOwner)
      assert.equal(balance, profit)
    })

    it('should delete store balance', async () => {
      const _store = await subject.store.call()
      assert.equal(_store[3].toNumber(), 0)
    })
  })
})
