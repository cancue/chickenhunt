const ChickenHuntStub = artifacts.require('./test/ChickenHuntStub.sol')
const helpers = require('./helpers.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

contract('Altar', ([committee, user1, user2, user3]) => {
  const users = [user1, user2, user3]
  let subject
  let altarFund = 1000
  let altarEthereum = () => altarFund * 0.1

  before(async () => {
    subject = await ChickenHuntStub.new()

    await Promise.all([
      subject.init(committee),
      subject.join({ from: user1 }),
      subject.join({ from: user2 }),
      subject.join({ from: user3 }),
      subject.setGenesis(),
      subject.setSavedChickenOf(user1, 999999999),
      subject.setSavedChickenOf(user2, 999999999),
      subject.setSavedChickenOf(user3, 999999999)
    ])
  })

  afterEach(async () => {
    (await subject.checkBalances.call(users)).should.be.bignumber.equal(0)
  })

  describe('chickenToAltar', () => {
    before(async () => {
      await subject.setAltarFundThousand()
    })

    describe('when amount is zero', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.chickenToAltar(0, { from: user1 })
        )
      })
    })

    describe('when amount is greater than chicken of user', () => {
      it('reverts', async () => {
        const chicken = await subject.chickenOf(user1)
        await helpers.assertRevert(
          subject.chickenToAltar(chicken.toNumber() + 2, { from: user1 })
        )
      })
    })

    it('should work', async () => {
      let _amount = 200
      const { logs } = await subject.chickenToAltar(_amount, { from: user1 })

      logs.length.should.be.equal(2)
      logs[0].event.should.be.equal('NewAltarRecord')
      logs[0].args.id.should.be.bignumber.equal(0)
      logs[0].args.ethereum.should.be.bignumber.equal(altarEthereum())
      logs[1].event.should.be.equal('ChickenToAltar')
      logs[1].args.user.should.be.equal(user1)
      logs[1].args.id.should.be.bignumber.equal(0)
      logs[1].args.chicken.should.be.bignumber.equal(_amount)

      const [record, tradeBook] = await Promise.all([
        subject.altarRecords.call(0),
        subject.tradeBooks.call(user1)
      ])
      record[0].should.be.bignumber.equal(altarEthereum())
      record[1].should.be.bignumber.equal(_amount)
      tradeBook[0].should.be.bignumber.equal(0)
      tradeBook[1].should.be.bignumber.equal(_amount)
    })
  })

  describe('ethereumFromAltar', () => {
    describe('until 1 day passes', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.ethereumFromAltar({ from: user1 })
        )
      })
    })

    describe('after 1 day from genesis', () => {
      let recordId, amount

      before(async () => {
        helpers.increaseTime(86400)
        let _res = await subject.tradeBooks.call(user1)
        recordId = _res[0]
        amount = _res[1]
      })

      it('should work', async () => {
        const { logs } = await subject.ethereumFromAltar({ from: user1 })
        const [ethereum, chicken] = await subject.altarRecords.call(recordId)
        const income = ethereum * amount / chicken

        logs.length.should.be.equal(1)
        logs[0].event.should.be.equal('EthereumFromAltar')
        logs[0].args.user.should.be.equal(user1)
        logs[0].args.id.should.be.bignumber.equal(recordId)
        logs[0].args.ethereum.should.be.bignumber.equal(income)
        const [tradeBook, ethereumBalance] = await Promise.all([
          subject.tradeBooks.call(user1),
          subject.ethereumBalance.call(user1)
        ])
        tradeBook[0].should.be.bignumber.equal(0)
        tradeBook[1].should.be.bignumber.equal(0)
        ethereumBalance.should.be.bignumber.equal(income)
      })
    })

    describe('after 8 days from genesis', () => {
      const recordId = 8

      before(async () => {
        helpers.increaseTime(86400 * 7)
        await subject.setAltarFundThousand()
      })

      describe('when user1 put 300 chicken', () => {
        it('should work', async () => {
          const chicken = 300
          const { logs } = await subject.chickenToAltar(chicken, { from: user1 })
          logs.length.should.be.equal(2)
          logs[0].event.should.be.equal('NewAltarRecord')
          logs[0].args.id.should.be.bignumber.equal(recordId)
          logs[0].args.ethereum.should.be.bignumber.equal(altarEthereum())
          logs[1].event.should.be.equal('ChickenToAltar')
          logs[1].args.user.should.be.bignumber.equal(user1)
          logs[1].args.id.should.be.bignumber.equal(recordId)
          logs[1].args.chicken.should.be.bignumber.equal(chicken)
        })
      })

      describe('when user2 put 100 chicken', () => {
        it('should work', async () => {
          const chicken = 100
          const { logs } = await subject.chickenToAltar(chicken, { from: user2 })
          logs.length.should.be.bignumber.equal(1)
          logs[0].event.should.be.equal('ChickenToAltar')
          logs[0].args.user.should.be.equal(user2)
          logs[0].args.id.should.be.bignumber.equal(recordId)
          logs[0].args.chicken.should.be.bignumber.equal(chicken)
        })
      })
    })

    describe('after 11 days from genesis', () => {
      const beforeRecordId = 8
      const recordId = 11

      before(async () => {
        helpers.increaseTime(86400 * 3)
        altarFund *= 0.9
      })

      describe('when user1 put 200 chicken', () => {
        it('should work', async () => {
          const chicken = 200
          const { logs } = await subject.chickenToAltar(chicken, { from: user1 })
          logs.length.should.be.equal(3)
          logs[0].event.should.be.equal('NewAltarRecord')
          logs[0].args.id.should.be.bignumber.equal(recordId)
          logs[0].args.ethereum.should.be.bignumber.equal(altarEthereum())
          logs[1].event.should.be.equal('EthereumFromAltar')
          logs[1].args.user.should.be.equal(user1)
          logs[1].args.id.should.be.bignumber.equal(beforeRecordId)
          logs[1].args.ethereum.should.be.bignumber.equal(75)
          logs[2].event.should.be.equal('ChickenToAltar')
          logs[2].args.user.should.be.bignumber.equal(user1)
          logs[2].args.id.should.be.bignumber.equal(recordId)
          logs[2].args.chicken.should.be.bignumber.equal(chicken)
        })
      })

      describe('when user3 put 1000 chicken', () => {
        it('should work', async () => {
          const chicken = 1000
          const { logs } = await subject.chickenToAltar(chicken, { from: user3 })
          logs.length.should.be.bignumber.equal(1)
          logs[0].event.should.be.equal('ChickenToAltar')
          logs[0].args.user.should.be.equal(user3)
          logs[0].args.id.should.be.bignumber.equal(recordId)
          logs[0].args.chicken.should.be.bignumber.equal(chicken)
        })
      })

      describe('when user2 put 800 chicken', () => {
        it('should work', async () => {
          const chicken = 800
          const { logs } = await subject.chickenToAltar(chicken, { from: user2 })
          logs.length.should.be.equal(2)
          logs[0].event.should.be.equal('EthereumFromAltar')
          logs[0].args.user.should.be.equal(user2)
          logs[0].args.id.should.be.bignumber.equal(beforeRecordId)
          logs[0].args.ethereum.should.be.bignumber.equal(25)
          logs[1].event.should.be.equal('ChickenToAltar')
          logs[1].args.user.should.be.bignumber.equal(user2)
          logs[1].args.id.should.be.bignumber.equal(recordId)
          logs[1].args.chicken.should.be.bignumber.equal(chicken)
        })
      })
    })

    describe('after 12 days from genesis', () => {
      const result = [100 + 75 + 9, 25 + 36, 45]

      before(async () => {
        helpers.increaseTime(86400)
      })

      it('should be valid', async () => {
        for (let i = 0; i < users.length; i++) {
          let _user = users[i]
          let _result = result[i]
          await subject.ethereumFromAltar({ from: _user })
          const tradeBook = await subject.tradeBooks.call(_user)
          assert.equal(tradeBook[1], 0)
          const ethereumBalance = await subject.ethereumBalance.call(_user)
          ethereumBalance.should.be.bignumber.equal(_result)
        }
      })
    })
  })
})
