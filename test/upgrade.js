const ChickenHuntStub = artifacts.require('./test/ChickenHuntStub.sol')
const helpers = require('./helpers.js')
const BigNumber = require('bignumber.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

const typeA = {
  ether: 0.00001,
  chicken: 100,
  max: 99
}

const typeB = {
  ether: 0.001,
  chicken: 100000,
  max: 9
}

const defaultChicken = 999999999999999999999

contract('Hunter - strength', ([committee, user]) => {
  const type = typeA
  const powerOf = (_to) => 10 * (_to ** 2)
  let subject

  before(async () => {
    subject = await ChickenHuntStub.new()
    subject.init(committee)
    await subject.join({ from: user })
  })

  afterEach(async () => {
    const checksum = await subject.checkBalances.call([user])
    // 1 is dividends error
    checksum.should.be.bignumber.most(1)
  })

  describe('to 2', () => {
    it('should work', async () => {
      await subject.setSavedChickenOf(user, defaultChicken)
      const to = 2
      const { logs } = await subject.upgradeStrength(to, {
        from: user,
        value: web3.toWei(0.00005, 'ether')
      })
      const afterChicken = await subject.savedChickenOf.call(user)
      checkEvents(logs, user, 'strength', 1, to, type, afterChicken)

      const details = await subject.detailsOf.call(user)
      const power = powerOf(to)
      assert.equal(power, 40)
      assert.equal(details[0][0], power) // huntingPower
      assert.equal(details[1][0], power) // offensePower
      assert.equal(details[3][0], to) // strength
      assert.equal(details[3][1], 1) // dexterity
    })
  })

  describe('to current value', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeStrength(2, {
          from: user,
          value: web3.toWei(3.18548, 'ether')
        })
      )
    })
  })

  describe('to exceeds max', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeStrength(type.max + 1, {
          from: user,
          value: web3.toWei(10, 'ether')
        })
      )
    })
  })

  describe('to max', () => {
    it('should work', async () => {
      await subject.setSavedChickenOf(user, defaultChicken)
      const to = type.max
      const { logs } = await subject.upgradeStrength(to, {
        from: user,
        value: web3.toWei(3.18548, 'ether')
      })
      const afterChicken = await subject.savedChickenOf.call(user)
      checkEvents(logs, user, 'strength', 2, to, type, afterChicken)

      const details = await subject.detailsOf.call(user)
      const power = powerOf(to)
      assert.equal(power, 98010)
      assert.equal(details[0][0], power) // huntingPower
      assert.equal(details[1][0], power) // offensePower
      assert.equal(details[3][0], to) // strength
      assert.equal(details[3][1], 1) // dexterity
    })
  })

  describe('when it is max', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeStrength(type.max + 1, {
          from: user,
          value: web3.toWei(10, 'ether')
        })
      )
    })
  })
})

contract('Hunter - dexterity', ([committee, user]) => {
  const type = typeB
  const powerOf = (_to) => (2 * (_to - 1) + 10) * 1
  let subject

  before(async () => {
    subject = await ChickenHuntStub.new()
    subject.init(committee)
    await subject.join({ from: user })
  })

  afterEach(async () => {
    const checksum = await subject.checkBalances.call([user])
    // 1 is dividends error
    checksum.should.be.bignumber.most(1)
  })

  describe('to 2', () => {
    it('should work', async () => {
      await subject.setSavedChickenOf(user, defaultChicken)
      const to = 2
      const { logs } = await subject.upgradeDexterity(to, {
        from: user,
        value: web3.toWei(0.005, 'ether')
      })
      const afterChicken = await subject.savedChickenOf.call(user)
      checkEvents(logs, user, 'dexterity', 1, to, type, afterChicken)

      const details = await subject.detailsOf.call(user)
      const power = powerOf(to)
      assert.equal(power, 12)
      assert.equal(details[0][0], power) // huntingPower
      assert.equal(details[1][0], power) // offensePower
      assert.equal(details[3][0], 1) // strength
      assert.equal(details[3][1], to) // dexterity
    })
  })

  describe('to current value', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeDexterity(2, {
          from: user,
          value: web3.toWei(0.203, 'ether')
        })
      )
    })
  })

  describe('to exceeds max', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeDexterity(type.max + 1, {
          from: user,
          value: web3.toWei(10, 'ether')
        })
      )
    })
  })

  describe('to max', () => {
    it('should work', async () => {
      await subject.setSavedChickenOf(user, defaultChicken)
      const to = type.max
      const { logs } = await subject.upgradeDexterity(to, {
        from: user,
        value: web3.toWei(0.203, 'ether')
      })
      const afterChicken = await subject.savedChickenOf.call(user)
      checkEvents(logs, user, 'dexterity', 2, to, type, afterChicken)

      const details = await subject.detailsOf.call(user)
      const power = powerOf(to)
      assert.equal(power, 26)
      assert.equal(details[0][0], power) // huntingPower
      assert.equal(details[1][0], power) // offensePower
      assert.equal(details[3][0], 1) // strength
      assert.equal(details[3][1], to) // dexterity
    })
  })

  describe('when it is max', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeDexterity(type.max + 1, {
          from: user,
          value: web3.toWei(10, 'ether')
        })
      )
    })
  })
})

contract('Hunter - constitution', ([committee, user]) => {
  const type = typeA
  const powerOf = (_to) => 10 * (_to ** 2) + 100
  let subject

  before(async () => {
    subject = await ChickenHuntStub.new()
    subject.init(committee)
    await subject.join({ from: user })
  })

  afterEach(async () => {
    const checksum = await subject.checkBalances.call([user])
    // 1 is dividends error
    checksum.should.be.bignumber.most(1)
  })

  describe('to 2', () => {
    it('should work', async () => {
      await subject.setSavedChickenOf(user, defaultChicken)
      const to = 2
      const { logs } = await subject.upgradeConstitution(to, {
        from: user,
        value: web3.toWei(0.00005, 'ether')
      })
      const afterChicken = await subject.savedChickenOf.call(user)
      checkEvents(logs, user, 'constitution', 1, to, type, afterChicken)

      const details = await subject.detailsOf.call(user)
      const power = powerOf(to)
      assert.equal(power, 140)
      assert.equal(details[2][0], power) // deffensePower
      assert.equal(details[3][2], to) // constitution
      assert.equal(details[3][3], 1) // resistance
    })
  })

  describe('to current value', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeConstitution(2, {
          from: user,
          value: web3.toWei(3.18548, 'ether')
        })
      )
    })
  })

  describe('to exceeds max', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeConstitution(type.max + 1, {
          from: user,
          value: web3.toWei(10, 'ether')
        })
      )
    })
  })

  describe('to max', () => {
    it('should work', async () => {
      await subject.setSavedChickenOf(user, defaultChicken)
      const to = type.max
      const { logs } = await subject.upgradeConstitution(to, {
        from: user,
        value: web3.toWei(3.18548, 'ether')
      })
      const afterChicken = await subject.savedChickenOf.call(user)
      checkEvents(logs, user, 'constitution', 2, to, type, afterChicken)

      const details = await subject.detailsOf.call(user)
      const power = powerOf(to)
      assert.equal(power, 98110)
      assert.equal(details[2][0], power) // deffensePower
      assert.equal(details[3][2], to) // constitution
      assert.equal(details[3][3], 1) // resistance
    })
  })

  describe('when it is max', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeConstitution(type.max + 1, {
          from: user,
          value: web3.toWei(10, 'ether')
        })
      )
    })
  })
})

contract('Hunter - resistance', ([committee, user]) => {
  const type = typeB
  const powerOf = (_to) => (2 * (_to - 1) + 10) * 1 + 100
  let subject

  before(async () => {
    subject = await ChickenHuntStub.new()
    subject.init(committee)
    await subject.join({ from: user })
  })

  afterEach(async () => {
    const checksum = await subject.checkBalances.call([user])
    // 1 is dividends error
    checksum.should.be.bignumber.most(1)
  })

  describe('to 2', () => {
    it('should work', async () => {
      await subject.setSavedChickenOf(user, defaultChicken)
      const to = 2
      const { logs } = await subject.upgradeResistance(to, {
        from: user,
        value: web3.toWei(0.005, 'ether')
      })
      const afterChicken = await subject.savedChickenOf.call(user)
      checkEvents(logs, user, 'resistance', 1, to, type, afterChicken)

      const details = await subject.detailsOf.call(user)
      const power = powerOf(to)
      assert.equal(power, 112)
      assert.equal(details[2][0], power) // deffensePower
      assert.equal(details[3][2], 1) // constitution
      assert.equal(details[3][3], to) // resistance
    })
  })

  describe('to current value', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeResistance(2, {
          from: user,
          value: web3.toWei(0.203, 'ether')
        })
      )
    })
  })

  describe('to exceeds max', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeResistance(type.max + 1, {
          from: user,
          value: web3.toWei(10, 'ether')
        })
      )
    })
  })

  describe('to max', () => {
    it('should work', async () => {
      await subject.setSavedChickenOf(user, defaultChicken)
      const to = type.max
      const { logs } = await subject.upgradeResistance(to, {
        from: user,
        value: web3.toWei(0.203, 'ether')
      })
      const afterChicken = await subject.savedChickenOf.call(user)
      checkEvents(logs, user, 'resistance', 2, to, type, afterChicken)

      const details = await subject.detailsOf.call(user)
      const power = powerOf(to)
      assert.equal(power, 126)
      assert.equal(details[2][0], power) // deffensePower
      assert.equal(details[3][2], 1) // constitution
      assert.equal(details[3][3], to) // resistance
    })
  })

  describe('when it is max', () => {
    it('reverts', async () => {
      await helpers.assertRevert(
        subject.upgradeResistance(type.max + 1, {
          from: user,
          value: web3.toWei(10, 'ether')
        })
      )
    })
  })
})

function checkEvents (_logs, _user, _for, _from, _to, _type, _afterChicken) {
  const expectedEthereum = squareSum(_type.ether, _from, _to) * (10 ** 18) * 0.2
  const expectedChicken = BigNumber(defaultChicken).minus(
    cubeSum(_type.chicken, _from, _to)
  ).toString(10)

  _logs.should.be.lengthOf(2)
  _afterChicken.minus(expectedChicken).should.be.bignumber.most(10) // delay
  _logs[0].event.should.be.equal('Transfer')
  _logs[0].args.from.should.be.equal(helpers.nullAddress)
  _logs[0].args.to.should.be.equal(_user)
  _logs[0].args.value.should.be.bignumber.equal(expectedEthereum)
  _logs[1].event.should.be.equal('UpgradeHunter')
  _logs[1].args.user.should.be.equal(_user)
  _logs[1].args.attribute.should.be.equal(_for)
  _logs[1].args.to.should.be.bignumber.equal(_to)
}

function squareSum (_default, _from, _to) {
  let _num = 0
  for (let i = _from; i < _to; i++) {
    _num += i ** 2
  }
  return _default * _num
}

function cubeSum (_default, _from, _to) {
  let _num = 0
  for (let i = _from; i < _to; i++) {
    _num += i ** 3
  }
  return _default * _num
}
