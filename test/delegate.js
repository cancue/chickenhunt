const ChickenHunt = artifacts.require('./ChickenHunt.sol')
const BigNumber = require('bignumber.js')
const helpers = require('./helpers.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

contract('GameBase - transferChickenFrom', ([
  committee, delegator, user, otherUser, stranger
]) => {
  let subject

  before(async () => {
    subject = await ChickenHunt.new()
    await subject.init(delegator)
    await subject.join({ from: user })
    await subject.join({ from: otherUser })
  })

  describe('after enough time', () => {
    let otherUserBalance
    let balance
    let amount

    before(async () => {
      await helpers.increaseTime(60 * 60 * 24 * 365 * 100);
      [balance, otherUserBalance] = await Promise.all([
        subject.chickenOf(user),
        subject.chickenOf(otherUser)
      ])
      amount = BigNumber(balance).div(9).integerValue().toString(10)
    })

    it('should make enough chicken', async () => {
      const expectedChicken = Math.floor(60 * 60 * 24 * 365 * 100)
      balance.should.be.bignumber.gte(expectedChicken)
    })

    it('should not change totalChicken since not saved', async () => {
      (await subject.totalChicken()).should.be.bignumber.equal(0)
    })

    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.transferChickenFrom(user, otherUser, amount, {
            from: stranger
          })
        )
      })
    })

    describe('when sender is committee', () => {
      describe('if value is greater than balance', () => {
        it('reverts', async () => {
          await helpers.assertRevert(
            subject.transferChickenFrom(user, otherUser, balance + 1, {
              from: delegator
            })
          )
        })
      })

      describe('if value is not greater than balance', () => {
        let logs

        before(async () => {
          logs = (await subject.transferChickenFrom(user, otherUser, amount, {
            from: delegator
          })).logs
        })

        it('should not emit event', async () => {
          logs.should.be.lengthOf(0)
        })

        it('should add unclaimed chicken of user to totalSupply', async () => {
          (await subject.totalChicken()).minus(balance)
            .should.be.bignumber.most(1)
        })

        it('should reduce chicken of from', async () => {
          (await subject.chickenOf(user)).minus(
            balance.minus(amount)
          ).should.be.bignumber.most(1)
        })

        it('should add chicken of to', async () => {
          (await subject.chickenOf(otherUser)).minus(
            otherUserBalance.plus(amount)
          ).should.be.bignumber.most(1)
        })
      })
    })
  })
})

contract('GameBase - saveChickenOf', ([ user, stranger ]) => {
  let subject

  before(async () => {
    console.log('fuck')
    subject = await ChickenHunt.new()
    await subject.init(user)
  })

  describe('after enough time', () => {
    let balance

    before(async () => {
      await helpers.increaseTime(60 * 60 * 24 * 365 * 100)
      balance = await subject.chickenOf(user)
    })

    it('should make enough chicken', async () => {
      const expectedChicken = Math.floor(60 * 60 * 24 * 365 * 100)
      balance.should.be.bignumber.gte(expectedChicken)
    })

    it('should not change totalChicken since not saved', async () => {
      (await subject.totalChicken()).should.be.bignumber.equal(0)
    })

    describe('when saveChickenOf stranger', () => {
      before(async () => {
        await subject.saveChickenOf(stranger)
      })

      it('should not change chicken of stranger', async () => {
        (await subject.chickenOf(stranger)).should.be.bignumber.equal(0)
      })

      it('should not change totalChicken', async () => {
        (await subject.totalChicken()).should.be.bignumber.equal(0)
      })
    })

    describe('when stranger has saved chicken', () => {
      let totalChicken

      before(async () => {
        await subject.transferChickenFrom(user, stranger, balance, {
          from: user
        })
        totalChicken = await subject.totalChicken()
        await helpers.increaseTime(60 * 60 * 24 * 365 * 100)
      })

      describe('when saveChickenOf stranger', () => {
        before(async () => {
          await subject.saveChickenOf(stranger)
        })

        it('should not change chicken of stranger', async () => {
          (await subject.chickenOf(stranger)).should.be.bignumber.equal(balance)
        })

        it('should not change totalChicken', async () => {
          (await subject.totalChicken()).should.be.bignumber.equal(totalChicken)
        })
      })
    })
  })
})
