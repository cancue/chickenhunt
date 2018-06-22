const ChickenHuntStub = artifacts.require('./test/ChickenHuntStub.sol')
const BigNumber = require('bignumber.js')
const helpers = require('./helpers.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

const distribution = {
  dev: 0.04,
  altar: 0.75,
  dividends: 0.20,
  store: 0.01
}

contract('GameBase', ([committee, user, stranger]) => {
  let subject

  before(async () => {
    subject = await ChickenHuntStub.new()
    await subject.init(committee)
  })

  afterEach(async () => {
    (await subject.checkBalances.call([user])).should.be.bignumber.equal(0)
  })

  describe('join', () => {
    let logs

    before(async () => {
      logs = (await subject.join({ from: user })).logs
    })

    it('should emit event', () => {
      logs.length.should.be.equal(1)
      logs[0].event.should.be.equal('Join')
      logs[0].args.user.should.be.equal(user)
    })

    it('set valid default value', async () => {
      const details = await subject.detailsOf.call(user)
      assert.equal(details[0][0], 10) // huntingPower
      assert.equal(details[0][1], 10) // huntingMultiplier
      assert.equal(details[1][0], 10) // offensePower
      assert.equal(details[1][1], 10) // offenseMultiplier
      assert.equal(details[2][0], 110) // defensePower
      assert.equal(details[2][1], 10) // defenseMultiplier
      assert.equal(details[3][0], 1) // strength
      assert.equal(details[3][1], 1) // dexterity
      assert.equal(details[3][2], 1) // constitution
      assert.equal(details[3][3], 1) // resistance
      assert.equal(details[4].length, 0) // pets
      assert.equal(details[5], 1) // depots
      assert.equal(details[6], 0) // savedChicken
      assert.notEqual(details[7], 0) // lastSaveTime
      assert.equal(details[8], 0) // cooldown
    })
  })

  describe('hunterOf', () => {
    describe('if not user', () => {
      it('should return proper values', async () => {
        const res = await subject.hunterOf.call(stranger)
        assert.equal(res[0], 0) // strength
        assert.equal(res[1], 0) // dexterity
        assert.equal(res[2], 0) // constitution
        assert.equal(res[3], 0) // resistance
      })
    })

    describe('if user', () => {
      it('should return proper values', async () => {
        const res = await subject.hunterOf.call(user)
        assert.equal(res[0], 1) // strength
        assert.equal(res[1], 1) // dexterity
        assert.equal(res[2], 1) // constitution
        assert.equal(res[3], 1) // resistance
      })
    })
  })

  describe('chcickenOf', () => {
    it('should work', async () => {
      const chicken = BigNumber(2).pow(128).times(Math.random()).integerValue()
      const power = BigNumber(2).pow(32).times(Math.random()).integerValue()
      const multiplier = BigNumber(2).pow(32).times(Math.random()).integerValue()
      await subject.setForChicken(user, chicken.toString(10), power.toString(10), multiplier.toString(10))

      const sec = Math.floor(Math.random() * (86400 * 365 * 100))
      await helpers.increaseTime(sec)
      const dps = power.times(multiplier)
      const currentChicken = await subject.chickenOf(user)
      assert.include(
        [
          '0',
          '-1',
          '1',
          dps.div(100).integerValue().toString(10),
          dps.div(100).integerValue().minus(1).toString(10)
        ],
        currentChicken.minus(
          chicken.plus(dps.times(sec).div(100).integerValue())
        ).toString(10),
        `dps: ${dps.toString(10)}, sec: ${sec}`
      )
    })
  })
})

contract('GameBase - _payChicken', ([committee, user]) => {
  let subject

  before(async () => {
    subject = await ChickenHuntStub.new()
    await subject.init(committee)
    await subject.join({ from: user })
    const chicken = Math.floor(Math.random() * (2 ** 4) + 16)
    const power = Math.floor(Math.random() * (2 ** 4) + 16)
    const multiplier = Math.floor(Math.random() * (2 ** 4) + 16)
    await subject.setForChicken(user, chicken, power, multiplier)
  })

  afterEach(async () => {
    (await subject.checkBalances.call([user])).should.be.bignumber.equal(0)
  })

  describe('when chicken is not enough', () => {
    it('reverts', async () => {
      const chicken = await subject.chickenOf.call(user)
      await helpers.assertRevert(
        subject.payChicken(user, chicken + 1)
      )
    })
  })

  describe('when chicken is enough', () => {
    it('should work', async () => {
      const chicken = await subject.chickenOf.call(user)
      const cost = Math.floor(Math.random() * chicken)

      const chickenBalance = await subject.payChicken.call(user, cost)
      assert.equal(chicken - chickenBalance, cost)
    })
  })
})

contract('GameBase - _payEthereumAndDistribute', ([committee, user]) => {
  let subject

  before(async () => {
    subject = await ChickenHuntStub.new()
    await subject.init(committee)
    await subject.join({ from: user })
    await subject.setDistribution(
      distribution.dividends * 100,
      distribution.altar * 100,
      distribution.store * 100,
      distribution.dev * 100
    )
    const [devCut, altarCut, store, dividendRate] = await Promise.all([
      subject.devCut(),
      subject.altarCut(),
      subject.store(),
      subject.dividendRate()
    ])
    assert.equal(devCut, distribution.dev * 100)
    assert.equal(altarCut, distribution.altar * 100)
    assert.equal(store[1], distribution.store * 100)
    assert.equal(dividendRate, distribution.dividends * 100)
  })

  afterEach(async () => {
    // 1 is dividends error
    (await subject.checkBalances.call([user])).should.be.bignumber.most(1)
  })

  describe('when ether is not enough', () => {
    describe('when ethereumBalance has not enough ether', () => {
      it('reverts', async () => {
        const cost = Math.floor(Math.random() * (2 ** 32)) + 1
        await helpers.assertRevert(
          subject.payEthereumAndDistribute(cost, {
            from: user,
            value: cost - 1
          })
        )
      })
    })

    describe('when ethereumBalance has enough ether', () => {
      after(async () => { await subject.withdraw({ from: user }) })

      it('should sub insufficient ether from ethereumBalance', async () => {
        const beforeBalances = await subject.getBalances()
        const cost = Math.floor(Math.random() * (2 ** 32))
        const extra = Math.floor(Math.random() * cost)
        const beforeBalance = extra + Math.floor(Math.random() * (2 ** 32))

        await subject.setEthereumBalance(user, beforeBalance, {
          from: user,
          value: beforeBalance
        })

        await subject.payEthereumAndDistribute(cost, {
          from: user,
          value: cost - extra
        })

        const ethereumBalance = await subject.ethereumBalance.call(user)
        assert.equal(
          ethereumBalance.toString().substring(0, 15),
          String(beforeBalance - extra).substring(0, 15)
        )

        const afterBalances = await subject.getBalances()
        checkDistribution(beforeBalances, afterBalances, cost)
      })
    })
  })

  describe('when ether is enough', () => {
    const cost = Math.floor(Math.random() * (2 ** 32))
    const extra = Math.floor(Math.random() * cost)

    it('should work', async () => {
      const beforeBalances = await subject.getBalances()

      await subject.payEthereumAndDistribute(cost, { from: user, value: cost })

      const ethereumBalance = await subject.ethereumBalance.call(user)
      assert.equal(ethereumBalance, 0)
      const afterBalances = await subject.getBalances()
      checkDistribution(beforeBalances, afterBalances, cost)
    })

    it('should add extra ether to ethereumBalance', async () => {
      const beforeBalances = await subject.getBalances()

      await subject.payEthereumAndDistribute(cost, {
        from: user,
        value: cost + extra
      })

      const ethereumBalance = await subject.ethereumBalance.call(user)
      ethereumBalance.should.be.bignumber.equal(extra)
      const afterBalances = await subject.getBalances()
      checkDistribution(beforeBalances, afterBalances, cost)
    })
  })
})

async function checkDistribution (_before, _after, _cost) {
  assert.equal(_before[0].toNumber() + _cost * distribution.altar, _after[0].toNumber())
  assert.equal(_before[1].toNumber() + _cost * distribution.store, _after[2].toNumber())
  assert(_before[2].toNumber() + _cost * distribution.dev >= _after[3].toNumber())
}
