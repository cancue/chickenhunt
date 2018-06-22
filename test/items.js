const ChickenHuntStub = artifacts.require('./test/ChickenHuntStub.sol')
const BigNumber = require('bignumber.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

const items = [
  {
    huntingMultiplier: 5,
    offenseMultiplier: 5,
    defenseMultiplier: 0,
    cost: 10000000000000000
  },
  {
    huntingMultiplier: 0,
    offenseMultiplier: 0,
    defenseMultiplier: 5,
    cost: 10000000000000000
  }
]

contract('Items', ([committee, secondOwner, thirdOwner]) => {
  let subject
  let id = Math.floor(Math.random() * items.length)

  before(async () => {
    subject = await ChickenHuntStub.new()
    await subject.init(committee)
    await Promise.all([
      subject.join({ from: secondOwner }),
      subject.join({ from: thirdOwner })
    ])
  })

  afterEach(async () => {
    const checksum = await subject.checkBalances.call([
      committee, secondOwner, thirdOwner
    ])
    checksum.should.be.bignumber.equal(0)
  })

  describe('item', () => {
    it('should work', async () => {
      const res = await subject.items.call(id)
      assert.equal(res[0], committee)
      assert.equal(res[1], items[id].huntingMultiplier)
      assert.equal(res[2], items[id].offenseMultiplier)
      assert.equal(res[3], items[id].defenseMultiplier)
      assert.equal(res[4], items[id].cost)
    })
  })

  describe('buyItem', () => {
    describe('from committee to secondOwner', () => {
      const from = committee
      const to = secondOwner
      const price = items[id].cost * 1.2
      let logs

      before(async () => {
        logs = (await subject.buyItem(id, {from: to, value: price})).logs
      })

      it('should emit events', () => {
        logs.should.be.lengthOf(1)
        logs[0].event.should.be.equal('BuyItem')
        logs[0].args.from.should.be.equal(from)
        logs[0].args.to.should.be.equal(to)
        logs[0].args.id.should.be.bignumber.equal(id)
        logs[0].args.cost.should.be.bignumber.equal(price)
      })

      it('should change the item info', async () => {
        const item = await subject.items.call(id)
        assert.equal(item[0], to)
        assert.equal(item[1], items[id].huntingMultiplier)
        assert.equal(item[2], items[id].offenseMultiplier)
        assert.equal(item[3], items[id].defenseMultiplier)
        assert.equal(item[4], price)
      })

      it('should transfer the item buff', async () => {
        const fromDetails = await subject.detailsOf(from)
        assert.equal(fromDetails[0][1], 15 - items[id].huntingMultiplier)
        assert.equal(fromDetails[1][1], 15 - items[id].offenseMultiplier)
        assert.equal(fromDetails[2][1], 15 - items[id].defenseMultiplier)

        const toDetails = await subject.detailsOf(to)
        assert.equal(toDetails[0][1], 10 + items[id].huntingMultiplier)
        assert.equal(toDetails[1][1], 10 + items[id].offenseMultiplier)
        assert.equal(toDetails[2][1], 10 + items[id].defenseMultiplier)
      })

      it('should change balances', async () => {
        const balance = await subject.ethereumBalance.call(from)
        assert.equal(balance.toNumber(), items[id].cost * 1.1)
        const devFee = await subject.devFee.call()
        assert.equal(devFee, items[id].cost * 0.1)
        const altarFund = await subject.altarFund.call()
        assert.equal(altarFund, 0)
        const totalShare = await subject.totalSupply.call()
        assert.equal(totalShare, 0)
      })
    })

    describe('from secondOwner to thirdOwner', () => {
      const from = secondOwner
      const to = thirdOwner
      const price = items[id].cost * 1.2 * 1.2
      let logs

      before(async () => {
        logs = (await subject.buyItem(id, {from: to, value: price})).logs
      })

      it('should emit events', () => {
        logs.should.be.lengthOf(1)
        logs[0].event.should.be.equal('BuyItem')
        logs[0].args.from.should.be.equal(from)
        logs[0].args.to.should.be.equal(to)
        logs[0].args.id.should.be.bignumber.equal(id)
        logs[0].args.cost.should.be.bignumber.equal(price)
      })

      it('should change the item info', async () => {
        const item = await subject.items.call(id)
        assert.equal(item[0], to)
        assert.equal(item[1], items[id].huntingMultiplier)
        assert.equal(item[2], items[id].offenseMultiplier)
        assert.equal(item[3], items[id].defenseMultiplier)
        assert.equal(item[4], price)
      })

      it('should transfer the item buff', async () => {
        const fromDetails = await subject.detailsOf(from)
        assert.equal(fromDetails[0][1], 10)
        assert.equal(fromDetails[1][1], 10)
        assert.equal(fromDetails[2][1], 10)

        const toDetails = await subject.detailsOf(to)
        assert.equal(toDetails[0][1], 10 + items[id].huntingMultiplier)
        assert.equal(toDetails[1][1], 10 + items[id].offenseMultiplier)
        assert.equal(toDetails[2][1], 10 + items[id].defenseMultiplier)
      })

      it('should change balances', async () => {
        const balance = await subject.ethereumBalance.call(from)
        balance.should.be.bignumber.equal(
          BigNumber(items[id].cost).times(1.2).times(1.1).toString(10)
        )
        const devFee = await subject.devFee.call()
        devFee.should.be.bignumber.equal(
          BigNumber(items[id].cost).times(0.1).times(1 + 1.2).toString(10)
        )
        const altarFund = await subject.altarFund.call()
        assert.equal(altarFund, 0)
        const totalShare = await subject.totalSupply.call()
        assert.equal(totalShare, 0)
      })
    })
  })
})
