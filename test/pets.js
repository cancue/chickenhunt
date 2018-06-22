const ChickenHuntStub = artifacts.require('./test/ChickenHuntStub.sol')
const helpers = require('./helpers.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

const pets = [
  {
    power: [1000, 0, 0],
    chicken: 100000,
    ethereum: 10000000000000000,
    max: 9
  },
  {
    power: [0, 1000, 0],
    chicken: 100000,
    ethereum: 10000000000000000,
    max: 9
  },
  {
    power: [0, 0, 1000],
    chicken: 202500,
    ethereum: 10000000000000000,
    max: 9
  }
]

contract('Pets', ([committee, user]) => {
  let subject
  let power = (_id, _total) => {
    let _value = pets[_id].power[_id]
    let _default = [10, 10, 110]
    _default[_id] = _default[_id] + _value * _total
    return _default
  }
  const id = Math.floor(Math.random() * pets.length)

  before(async () => {
    subject = await ChickenHuntStub.new()
    await subject.init(committee)
    await subject.join({ from: user })
    await subject.setSavedChickenOf(user, 999999999)
  })

  afterEach(async () => {
    const checksum = await subject.checkBalances.call([user])
    // 1 is dividends error
    checksum.should.be.bignumber.most(1)
  })

  describe('pets', () => {
    it('should work', async () => {
      const pet = await subject.pets.call(id)
      assert.equal(pet[0], pets[id].power[0])
      assert.equal(pet[1], pets[id].power[1])
      assert.equal(pet[2], pets[id].power[2])
      assert.equal(pet[3], pets[id].chicken)
      assert.equal(pet[4], pets[id].ethereum)
      assert.equal(pet[5], pets[id].max)
    })
  })

  describe('buyPets', () => {
    describe('when amount is one', () => {
      const amount = 1
      let logs

      before(async () => {
        logs = (await subject.buyPets(id, amount, {
          from: user,
          value: pets[id].ethereum
        })).logs
      })

      it('should emit events', () => {
        logs.should.be.lengthOf(2)
        logs[0].event.should.be.equal('Transfer')
        logs[0].args.from.should.be.equal(helpers.nullAddress)
        logs[0].args.to.should.be.equal(user)
        logs[0].args.value.should.be.bignumber.equal(
          Math.floor(amount * pets[id].ethereum * 0.2)
        )
        logs[1].event.should.be.equal('UpgradePet')
        logs[1].args.user.should.be.equal(user)
        logs[1].args.id.should.be.bignumber.equal(id)
        logs[1].args.to.should.be.bignumber.equal(amount)
      })

      it('should work', async () => {
        const details = await subject.detailsOf.call(user)
        let _power = power(id, amount)
        let _expect = [1010, 1010, 1110]
        assert.equal(_power[id], _expect[id])
        assert.equal(details[0][0], _power[0]) // huntingPower
        assert.equal(details[1][0], _power[1]) // offensePower
        assert.equal(details[2][0], _power[2]) // defensePower
        assert.equal(details[4][id], amount) // pet
      })
    })
  })

  describe('when amount exceeds max', () => {
    it('reverts', async () => {
      const amount = pets[id].max
      await helpers.assertRevert(
        subject.buyPets(id, amount, {
          from: user,
          value: pets[id].ethereum
        })
      )
    })
  })

  describe('when amount is to max', () => {
    const amount = pets[id].max - 1
    let logs

    before(async () => {
      logs = (await subject.buyPets(id, amount, {
        from: user,
        value: pets[id].ethereum * amount
      })).logs
    })

    it('should emit events', () => {
      logs.should.be.lengthOf(2)
      logs[0].event.should.be.equal('Transfer')
      logs[0].args.from.should.be.equal(helpers.nullAddress)
      logs[0].args.to.should.be.equal(user)
      logs[0].args.value.should.be.bignumber.equal(
        Math.floor(amount * pets[id].ethereum * 0.2)
      )
      logs[1].event.should.be.equal('UpgradePet')
      logs[1].args.user.should.be.equal(user)
      logs[1].args.id.should.be.bignumber.equal(id)
      logs[1].args.to.should.be.bignumber.equal(pets[id].max)
    })

    it('amount to max should work', async () => {
      const details = await subject.detailsOf.call(user)
      let _power = power(id, pets[id].max)
      let _expect = [9010, 9010, 9110]
      assert.equal(_power[id], _expect[id])
      assert.equal(details[0][0], _power[0]) // huntingPower
      assert.equal(details[1][0], _power[1]) // offensePower
      assert.equal(details[2][0], _power[2]) // defensePower
      assert.equal(details[4][id], pets[id].max) // pet
    })
  })

  describe('when it is max', () => {
    it('reverts', async () => {
      const amount = 1
      await helpers.assertRevert(
        subject.buyPets(id, amount, {
          from: user,
          value: pets[id].ethereum * amount
        })
      )
    })
  })
})
