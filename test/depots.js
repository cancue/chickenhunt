const ChickenHuntStub = artifacts.require('./test/ChickenHuntStub.sol')
const helpers = require('./helpers.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

const depot = {
  wei: 50000000000000000,
  max: 9
}

contract('Depot', ([committee, user]) => {
  let subject

  before(async () => {
    subject = await ChickenHuntStub.new()
    await Promise.all([
      subject.init(committee),
      subject.join({ from: user })
    ])
  })

  afterEach(async () => {
    (await subject.checkBalances.call([user])).should.be.bignumber.equal(0)
  })

  describe('depot', () => {
    it('should work', async () => {
      const res = await subject.depot.call()
      res[0].should.be.bignumber.equal(depot.wei)
      res[1].should.be.bignumber.equal(depot.max)
    })
  })

  describe('buyDepots', () => {
    describe('when amount is one', () => {
      const amount = 1
      let logs

      before(async () => {
        logs = (await subject.buyDepots(amount, {
          from: user,
          value: amount * depot.wei
        })).logs
      })

      it('should emit events', () => {
        logs.should.be.lengthOf(2)
        logs[0].event.should.be.equal('Transfer')
        logs[0].args.from.should.be.equal(helpers.nullAddress)
        logs[0].args.to.should.be.equal(user)
        logs[0].args.value.should.be.bignumber.equal(
          Math.floor(amount * depot.wei * 0.2)
        )
        logs[1].event.should.be.equal('UpgradeDepot')
        logs[1].args.user.should.be.equal(user)
        logs[1].args.to.should.be.bignumber.equal(2)
      })

      it('should work', async () => {
        const details = await subject.detailsOf.call(user)
        details[5].should.be.bignumber.equal(2) // depots
      })
    })

    describe('when amount exceeds max', () => {
      it('reverts', async () => {
        const amount = depot.max
        await helpers.assertRevert(
          subject.buyDepots(amount, {
            from: user,
            value: amount * depot.wei
          })
        )
      })
    })

    describe('when amount is to max', () => {
      const amount = depot.max - 2
      let logs

      before(async () => {
        logs = (await subject.buyDepots(amount, {
          from: user,
          value: amount * depot.wei
        })).logs
      })

      it('should emit events', () => {
        logs.should.be.lengthOf(2)
        logs[0].event.should.be.equal('Transfer')
        logs[0].args.from.should.be.equal(helpers.nullAddress)
        logs[0].args.to.should.be.equal(user)
        logs[0].args.value.should.be.bignumber.equal(
          Math.floor(amount * depot.wei * 0.2)
        )
        logs[1].event.should.be.equal('UpgradeDepot')
        logs[1].args.user.should.be.equal(user)
        logs[1].args.to.should.be.bignumber.equal(depot.max)
      })

      it('should work', async () => {
        const details = await subject.detailsOf.call(user)
        details[5].should.be.bignumber.equal(depot.max) // depots
      })
    })

    describe('when it is max', () => {
      it('reverts', async () => {
        const amount = 1
        await helpers.assertRevert(
          subject.buyDepots(amount, {
            from: user,
            value: amount * depot.wei
          })
        )
      })
    })
  })
})
