const ChickenTokenDelegator = artifacts.require('./ChickenTokenDelegator.sol')
const ChickenTokenDelegateStub = artifacts.require('./test/ChickenTokenDelegateStub.sol')
const helpers = require('./helpers.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

contract('ChickenToken - basic tests', ([manager, notManager]) => {
  let subject

  before(async () => {
    subject = await ChickenTokenDelegator.new()
  })

  describe('details', () => {
    it('should have a name', async function () {
      const name = await subject.name()
      assert.equal(name, 'Chicken')
    })

    it('should have a symbol', async function () {
      const symbol = await subject.symbol()
      assert.equal(symbol, 'CHICKEN')
    })

    it('should have an amount of decimals', async function () {
      const decimals = await subject.decimals()
      assert.equal(decimals, 0)
    })
  })

  describe('setNameAndSymbol', () => {
    const newName = 'kang'
    const newSymbol = 'kng'

    describe('when sender is not manager', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.setNameAndSymbol(newName, newSymbol, {
            from: notManager
          })
        )
      })
    })

    describe('when sender is manager', () => {
      it('should work', async () => {
        await subject.setNameAndSymbol(newName, newSymbol, { from: manager })
        const nameAndSymbol = await Promise.all([
          subject.name(),
          subject.symbol()
        ])
        nameAndSymbol.should.be.deep.equal([newName, newSymbol])
      })
    })
  })

  describe('setChickenHunt', () => {
    const targetAddress = manager

    before(async () => {
      (await subject.chickenHunt()).should.be.equal(helpers.nullAddress)
    })

    describe('when sender is not manager', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.setChickenHunt(targetAddress, { from: notManager })
        )
      })
    })

    describe('when sender is manager', () => {
      describe('first set', () => {
        it('should work', async () => {
          await subject.setChickenHunt(targetAddress, { from: manager })
          const newAddress = await subject.chickenHunt()
          newAddress.should.be.equal(targetAddress)
        })
      })

      describe('after set', () => {
        it('reverts', async () => {
          await helpers.assertRevert(
            subject.setChickenHunt(targetAddress, { from: manager })
          )
        })
      })
    })
  })
})

const values = {
  transferResult: true,
  saveChickenOf: Math.floor(Math.random() * 1000 + 1000),
  totalChicken: Math.floor(Math.random() * 1000 + 1000),
  chickenOf: Math.floor(Math.random() * 1000 + 1000),
  amount: Math.floor(Math.random() * 1000 + 1000)
}

contract('ChickenToken - interaction tests', ([manager, user1, user2, user3]) => {
  let subject, delegate

  before(async () => {
    delegate = await ChickenTokenDelegateStub.new()
    subject = await ChickenTokenDelegator.new()
    await Promise.all([
      subject.setChickenHunt(delegate.address, { from: manager }),
      delegate.setValues(
        values.transferResult,
        values.saveChickenOf,
        values.totalChicken,
        values.chickenOf,
        { from: manager }
      )
    ])
  })

  describe('total supply', () => {
    it('should call chickenHunt.totalChicken', async () => {
      const totalSupply = await subject.totalSupply()

      assert(totalSupply, values.totalChicken)
    })
  })

  describe('balanceOf', () => {
    it('should call chickenHunt.chickenOf', async () => {
      const balance = await subject.balanceOf(user2)

      assert(balance, values.chickenOf)
    })
  })

  describe('saveChickenOf', () => {
    it('should call chickenHunt.saveChickenOf', async () => {
      const balance = await subject.saveChickenOf(user2)

      assert(balance, values.saveChickenOf)
    })
  })

  describe('transfer', () => {
    describe('when success', () => {
      it('should emit event', async () => {
        const _res = await subject.transfer(user2, values.amount, {
          from: user1
        })

        assert.equal(_res.logs[0].event, 'Transfer')
        assert.equal(_res.logs[0].args.from, user1)
        assert.equal(_res.logs[0].args.to, user2)
        assert.equal(_res.logs[0].args.value, values.amount)
      })
    })

    describe('when failure', () => {
      before(async () => {
        await delegate.setValues(
          false,
          values.saveChickenOf,
          values.totalChicken,
          values.chickenOf,
          { from: manager }
        )
      })

      it('should not emit event', async () => {
        const _res = await subject.transfer(user2, values.amount, {
          from: user1
        })

        assert.equal(_res.logs.length, 0)
      })
    })
  })

  describe('approval', () => {
    let approval = Math.floor(Math.random() * 500) + 500
    values.amount = Math.floor(Math.random() * approval)

    describe('approve', () => {
      it('should emit event', async () => {
        const { logs } = await subject.approve(user2, approval, {
          from: user1
        })

        assert.equal(logs[0].event, 'Approval')
        assert.equal(logs[0].args.owner, user1)
        assert.equal(logs[0].args.spender, user2)
        assert.equal(logs[0].args.value, approval)
      })
    })

    describe('allowance', () => {
      it('should return approval', async () => {
        const allowance = await subject.allowance(user1, user2)
        assert.equal(allowance, approval)
      })
    })

    describe('transferFrom', () => {
      describe('when the value is more than approval', () => {
        it('reverts', async () => {
          await helpers.assertRevert(subject.transferFrom(user1, user3, approval + 1, { from: user2 }))
        })
      })

      describe('when failure', () => {
        it('should not emit event', async () => {
          const { logs } = await subject.transferFrom(user1, user3, approval, {
            from: user2
          })

          assert.equal(logs.length, 0)
          const _allowance = await subject.allowance(user1, user2)
          assert.equal(_allowance, approval)
        })
      })

      describe('when success', () => {
        let logs

        before(async () => {
          await delegate.setValues(
            true,
            values.saveChickenOf,
            values.totalChicken,
            values.chickenOf,
            { from: manager }
          )

          logs = (await subject.transferFrom(user1, user3, values.amount, { from: user2 })).logs
        })

        it('should emit event', async () => {
          assert.equal(logs[0].event, 'Transfer')
          assert.equal(logs[0].args.from, user1)
          assert.equal(logs[0].args.to, user3)
          assert.equal(logs[0].args.value, values.amount)
        })

        it('should reduce allowance', async () => {
          const allowance = await subject.allowance(user1, user2)
          assert.equal(allowance, approval - values.amount)
        })
      })
    })
  })
})
