const ChickenHuntStub = artifacts.require('./test/ChickenHuntStub.sol')
const helpers = require('./helpers.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

const cooldownTime = 60 * 10
const attacker = {
  offensePower: 10,
  defensePower: 110,
  offenseMultiplier: 10,
  defenseMultiplier: 10,
  depots: 1,
  chicken: 1000
}
const defender = {
  offensePower: 10,
  defensePower: 110,
  offenseMultiplier: 10,
  defenseMultiplier: 10,
  depots: 1,
  chicken: 1000
}

contract('Arena', ([committee, user1, user2]) => {
  let subject
  attacker.address = user1
  defender.address = user2
  const users = [user1, user2]

  before(async () => {
    subject = await ChickenHuntStub.new()

    await Promise.all([
      subject.init(committee),
      subject.join({ from: attacker.address }),
      subject.join({ from: defender.address })
    ])
  })

  afterEach(async () => {
    (await subject.checkBalances.call(users)).should.be.bignumber.equal(0)
  })

  describe('when offense is less than defense', async () => {
    let logs

    before(async () => {
      let _randMax = 10
      let _rands = []
      _rands.push(Math.floor(Math.random() * _randMax))
      _rands.push(_randMax - _rands[0])
      _rands.push(Math.floor(Math.random() * _randMax))
      _rands.push(_randMax - _rands[2])
      await subject.setStats(
        attacker.address,
        2 ** _rands[0],
        attacker.defensePower,
        2 ** _rands[1],
        attacker.defenseMultiplier,
        attacker.depots,
        attacker.chicken
      )
      await subject.setStats(
        defender.address,
        defender.offensePower,
        2 ** _rands[2],
        defender.offenseMultiplier,
        2 ** _rands[3],
        defender.depots,
        defender.chicken
      )
      logs = (await subject.attack(defender.address, {
        from: attacker.address
      })).logs
    })

    it('should emit no events', async () => {
      assert.equal(logs.length, 0)
    })

    it('should steal nothing', async () => {
      const [attackerChicken, defenderChicken] = await Promise.all([
        subject.chickenOf.call(attacker.address),
        subject.chickenOf.call(defender.address)
      ])
      attackerChicken.should.be.bignumber.equal(attacker.chicken)
      defenderChicken.should.be.bignumber.equal(defender.chicken)
    })

    it('should not update cooldown', async () => {
      const [attackerDetails, defenderDetails, { timestamp }] = await Promise.all([
        subject.detailsOf(attacker.address),
        subject.detailsOf(defender.address),
        web3.eth.getBlock('latest')
      ])
      attackerDetails[8].should.be.bignumber.lessThan(timestamp)
      defenderDetails[8].should.be.bignumber.lessThan(timestamp)
    })
  })

  describe('when offense is at least defense', async () => {
    const booty = defender.chicken
    let logs

    before(async () => {
      let _randMax = 10
      let _rands = []
      _rands.push(Math.floor(Math.random() * _randMax))
      _rands.push(_randMax - _rands[0])
      _rands.push(Math.floor(Math.random() * _randMax))
      _rands.push(_randMax - _rands[2])
      if (Math.random() < 0.5) {
        _rands[0] = 2 ** (_rands[2] + _rands[3]) + 1
        _rands[1] = 1
      } else {
        _rands[0] = 1
        _rands[1] = 2 ** (_rands[2] + _rands[3]) + 1
      }
      await subject.setStats(
        attacker.address,
        _rands[0],
        attacker.defensePower,
        _rands[1],
        attacker.defenseMultiplier,
        attacker.depots,
        attacker.chicken
      )
      await subject.setStats(
        defender.address,
        defender.offensePower,
        2 ** _rands[2],
        defender.offenseMultiplier,
        2 ** _rands[3],
        defender.depots,
        defender.chicken
      )
      logs = (await subject.attack(defender.address, {
        from: attacker.address
      })).logs
    })

    it('should emit event', async () => {
      logs[0].event.should.be.equal('Attack')
      logs[0].args.attacker.should.be.equal(attacker.address)
      logs[0].args.defender.should.be.equal(defender.address)
      logs[0].args.booty.should.be.bignumber.equal(booty)
    })

    it('should steal proper booty', async () => {
      const [attackerChicken, defenderChicken] = await Promise.all([
        subject.chickenOf.call(attacker.address),
        subject.chickenOf.call(defender.address)
      ])
      attackerChicken.should.be.bignumber.equal(attacker.chicken + booty)
      defenderChicken.should.be.bignumber.equal(defender.chicken - booty)
    })

    it('should update cooldown', async () => {
      const [attackerDetails, defenderDetails, { timestamp }] = await Promise.all([
        subject.detailsOf(attacker.address),
        subject.detailsOf(defender.address),
        web3.eth.getBlock('latest')
      ])
      attackerDetails[8].should.be.bignumber.equal(timestamp + cooldownTime)
      defenderDetails[8].should.be.bignumber.lessThan(timestamp)
    })
  })

  describe('attackCooldown', () => {
    before(async () => {
      await subject.setStats(
        attacker.address,
        defender.defensePower + 1,
        attacker.defensePower,
        defender.defenseMultiplier,
        attacker.defenseMultiplier,
        attacker.depots,
        attacker.chicken
      )
      await subject.setStats(
        defender.address,
        defender.offensePower,
        defender.defensePower,
        defender.offenseMultiplier,
        defender.defenseMultiplier,
        defender.depots,
        defender.chicken
      )
    })

    describe('when attaker is cooling down', () => {
      it('reverts', async () => {
        await helpers.increaseTime(cooldownTime - 1)
        await helpers.assertRevert(
          subject.attack(defender.address, { from: attacker.address })
        )
      })
    })

    describe('after cooldown time', () => {
      it('should work', async () => {
        await helpers.increaseTime(2)
        const { logs } = await subject.attack(defender.address,
          { from: attacker.address }
        )
        logs[0].event.should.be.equal('Attack')
      })
    })
  })

  describe('depots', () => {
    const depots = Math.floor(Math.random() * 1000)
    let logs, booty

    before(async () => {
      await helpers.increaseTime(cooldownTime * 2)
      await subject.setStats(
        attacker.address,
        defender.defensePower + 1,
        attacker.defensePower,
        defender.defenseMultiplier,
        attacker.defenseMultiplier,
        attacker.depots,
        attacker.chicken
      )
      await subject.setStats(
        defender.address,
        defender.offensePower,
        defender.defensePower,
        defender.offenseMultiplier,
        defender.defenseMultiplier,
        depots,
        defender.chicken
      )
      booty = Math.floor(defender.chicken / depots)
      logs = (await subject.attack(defender.address, {
        from: attacker.address
      })).logs
    })

    describe(`when depots is ${depots}`, () => {
      describe(`booty should be devided by ${depots}`, async () => {
        it('should emit event', async () => {
          logs[0].event.should.be.equal('Attack')
          logs[0].args.attacker.should.be.equal(attacker.address)
          logs[0].args.defender.should.be.equal(defender.address)
          logs[0].args.booty.should.be.bignumber.equal(booty)
        })

        it('should steal proper booty', async () => {
          const [attackerChicken, defenderChicken] = await Promise.all([
            subject.chickenOf.call(attacker.address),
            subject.chickenOf.call(defender.address)
          ])
          attackerChicken.should.be.bignumber.equal(attacker.chicken + booty)
          defenderChicken.should.be.bignumber.equal(defender.chicken - booty)
        })
      })
    })
  })
})
