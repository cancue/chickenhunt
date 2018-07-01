const CHStockStub = artifacts.require('./test/CHStockStub.sol')
const helpers = require('./helpers.js')
const BigNumber = require('bignumber.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

contract('Stock - one user', ([committee, user]) => {
  const wei = BigNumber(2).pow(64).integerValue().toString(10)
  let subject

  before(async () => {
    subject = await CHStockStub.new()
    await subject.init(committee)
  })

  afterEach(async () => {
    const checksum = await subject.checkBalances.call([user])
    // 1 is dividends error
    checksum.should.be.bignumber.most(1)
  })

  describe('giveShare', () => {
    let logs

    before(async () => {
      logs = (await subject.giveShares(user, wei)).logs
    })

    it('should emit event', () => {
      logs.should.be.lengthOf(1)
      logs[0].event.should.be.equal('Transfer')
      logs[0].args.from.should.be.equal(helpers.nullAddress)
      logs[0].args.to.should.be.equal(user)
      logs[0].args.value.should.be.bignumber.equal(wei)
    })

    it('should set totalSupply', async () => {
      const totalSupply = await subject.totalSupply.call()
      assert.equal(totalSupply, wei)
    })

    it('should set balance', async () => {
      const balance = await subject.balanceOf(user)
      assert.equal(balance, wei)
    })

    it('should set dividends 100%', async () => {
      const dividends = await subject.dividendsOf(user)
      assert.equal(dividends, wei)
    })

    describe('redeemShares', () => {
      let logs

      before(async () => {
        logs = (await subject.redeemShares({ from: user })).logs
      })

      it('should emit event', () => {
        logs.should.be.lengthOf(1)
        logs[0].event.should.be.equal('RedeemShares')
        logs[0].args.user.should.be.equal(user)
        logs[0].args.shares.should.be.bignumber.equal(wei)
        logs[0].args.dividends.should.be.bignumber.equal(wei)
      })

      it('should add dividends to ethereumBalance', async () => {
        const ethereumBalance = await subject.ethereumBalance(user)
        assert.equal(ethereumBalance, wei)
      })

      it('should clear balanceOf sender', async () => {
        const balance = await subject.balanceOf(user)
        assert.equal(balance, 0)
      })

      it('should clear totalSupply', async () => {
        const totalSupply = await subject.totalSupply.call()
        assert.equal(totalSupply, 0)
      })
    })
  })
})

// most 1~2 is dividends error
contract('Stock - three users', ([committee, user1, user2, user3, user4]) => {
  const wei = BigNumber(2).pow(32).integerValue().toString(10)
  const users = [user1, user2, user3]
  let subject

  before(async () => {
    subject = await CHStockStub.new()
    await subject.init(committee)
  })

  afterEach(async () => {
    const checksum = await subject.checkBalances.call([
      user1, user2, user3, user4
    ])
    checksum.should.be.bignumber.most(2)
  })

  describe('giveShare', () => {
    before(async () => {
      await Promise.all(
        users.map((addr) => subject.giveShares(addr, wei))
      )
      const balances = await Promise.all(
        users.map((addr) => subject.balanceOf(addr))
      )

      for (let balance of balances) {
        assert.equal(balance, wei)
      }
    })

    it('should calculate proper dividends', async () => {
      const dividends = await Promise.all(
        users.map((addr) => subject.dividendsOf(addr))
      )
      let totalDividends = await subject.totalSupply.call()

      dividends[0].minus(
        BigNumber(wei).times(
          BigNumber(1).div(3)
            .plus(BigNumber(1).div(2))
            .plus(BigNumber(1))
        ).integerValue().toString(10)
      ).should.be.bignumber.most(1)

      dividends[1].minus(
        BigNumber(wei).times(
          BigNumber(1).div(3)
            .plus(BigNumber(1).div(2))
        ).integerValue().toString(10)
      ).should.be.bignumber.most(1)

      dividends[2].minus(
        BigNumber(wei).times(
          BigNumber(1).div(3)
        ).integerValue().toString(10)
      ).should.be.bignumber.most(1)

      assert(
        BigNumber(totalDividends)
          .minus(dividends[0])
          .minus(dividends[1])
          .minus(dividends[2]).lte(1)
      )
    })

    it('should set totalSupply', async () => {
      const totalSupply = await subject.totalSupply.call()
      totalSupply.should.be.bignumber.equal(BigNumber(wei).times(users.length).toString(10))
    })
  })

  describe('transfer', () => {
    let dividends

    before(async () => {
      dividends = await Promise.all(
        users.map((addr) => subject.dividendsOf(addr))
      )
    })

    describe('after user2 transfer to user3 greater than balance', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.transfer(users[2], wei + 1, { from: users[1] })
        )
      })
    })

    describe('after user2 transfer to user3 whole balance', () => {
      let logs

      before(async () => {
        logs = (await subject.transfer(users[2], wei, { from: users[1] })).logs
      })

      it('should emit event', () => {
        logs.should.be.lengthOf(1)
        logs[0].event.should.be.equal('Transfer')
        logs[0].args.from.should.be.equal(users[1])
        logs[0].args.to.should.be.equal(users[2])
        logs[0].args.value.should.be.bignumber.equal(wei)
      })

      it('should not affect to dividends', async () => {
        const newDividends = await Promise.all(
          users.map((addr) => subject.dividendsOf(addr))
        )
        newDividends.should.be.deep.equal(dividends)
      })
    })

    describe('after user3 transfer to user2 some balance', () => {
      const someWei = BigNumber(wei).div(2).integerValue().toString(10)
      let logs

      before(async () => {
        logs = (await subject.transfer(
          users[1],
          someWei,
          { from: users[2] }
        )).logs
      })

      it('should emit event', () => {
        logs.should.be.lengthOf(1)
        logs[0].event.should.be.equal('Transfer')
        logs[0].args.from.should.be.equal(users[2])
        logs[0].args.to.should.be.equal(users[1])
        logs[0].args.value.should.be.bignumber.equal(someWei)
      })

      it('should not affect to dividends', async () => {
        const newDividends = await Promise.all(
          users.map((addr) => subject.dividendsOf(addr))
        )
        newDividends.should.be.deep.equal(dividends)
      })

      describe('when additional giveShare occured', async () => {
        before(async () => {
          await subject.giveShares(user4, wei)
        })
      })

      it('should affect to dividends', async () => {
        await subject.giveShares(user4, wei)
        const [dividends1, dividends2] = await Promise.all([
          subject.dividendsOf(users[1]),
          subject.dividendsOf(users[2])
        ])
        dividends1.should.be.bignumber.equal(
          dividends[1].plus(BigNumber(wei).div(8).integerValue()).toString(10)
        )
        dividends2.should.be.bignumber.equal(
          dividends[2].plus(
            BigNumber(wei).times(3).div(8).integerValue()
          ).toString(10)
        )
      })
    })
  })

  describe('approval', () => {
    const approval = Math.floor(wei * 0.25)
    const owner = users[0]
    const spender = users[1]
    const receiver = users[2]
    let dividends

    before(async () => {
      dividends = await Promise.all(
        users.map((addr) => subject.dividendsOf(addr))
      )
    })

    describe('approve', () => {
      it('should emit event', async () => {
        const { logs } = await subject.approve(spender, approval, {
          from: owner
        })

        logs.should.be.lengthOf(1)
        logs[0].event.should.be.equal('Approval')
        logs[0].args.owner.should.be.equal(owner)
        logs[0].args.spender.should.be.equal(spender)
        logs[0].args.value.should.be.bignumber.equal(approval)
      })
    })

    describe('allowance', () => {
      it('should return approval', async () => {
        const allowance = await subject.allowance(owner, spender)
        assert.equal(allowance, approval)
      })
    })

    describe('transferFrom', () => {
      describe('when the value is greater than approval', () => {
        it('reverts', async () => {
          await helpers.assertRevert(
            subject.transferFrom(owner, receiver, approval + 1, {
              from: spender
            })
          )
        })
      })

      describe('when the value is not greater than approval', () => {
        const value = Math.floor(approval * 0.5)
        let logs

        before(async () => {
          logs = (await subject.transferFrom(owner, receiver, value, {
            from: spender
          })).logs
        })

        it('should emit event', async () => {
          logs.should.be.lengthOf(1)
          logs[0].event.should.be.equal('Transfer')
          logs[0].args.from.should.be.equal(owner)
          logs[0].args.to.should.be.equal(receiver)
          logs[0].args.value.should.be.bignumber.equal(value)
        })

        it('should reduce allowance', async () => {
          const allowance = await subject.allowance(owner, spender)
          assert.equal(allowance.toNumber(), approval - value)
        })

        it('should not affect to dividends', async () => {
          const newDividends = await Promise.all(
            users.map((addr) => subject.dividendsOf(addr))
          )
          newDividends.should.be.deep.equal(dividends)
        })
      })
    })
  })

  describe('when user redeemShares', () => {
    const user = users[Math.floor(Math.random() * users.length)]
    let totalSupply, shares, dividends, ethereumBalance, logs

    before(async () => {
      [
        totalSupply,
        shares,
        dividends,
        ethereumBalance
      ] = await Promise.all([
        subject.totalSupply(),
        subject.balanceOf(user),
        subject.dividendsOf(user),
        subject.ethereumBalance(user)
      ])
      logs = (await subject.redeemShares({ from: user })).logs
    })

    it('should emit event', () => {
      logs.should.be.lengthOf(1)
      logs[0].event.should.be.equal('RedeemShares')
      logs[0].args.user.should.be.equal(user)
      logs[0].args.shares.should.be.bignumber.equal(shares)
      logs[0].args.dividends.should.be.bignumber.equal(dividends)
    })

    it('should add dividends to ethereumBalance', async () => {
      (await subject.ethereumBalance(user)).should.be.bignumber.equal(
        ethereumBalance + dividends
      )
    })

    it('should clear balanceOf sender', async () => {
      (await subject.balanceOf(user)).should.be.bignumber.equal(0)
    })

    it('should clear totalSupply', async () => {
      (await subject.totalSupply.call()).should.be.bignumber.equal(
        totalSupply - shares
      )
    })
  })
})

// most 1~2 is dividends error
contract('Stock - get dividends without burning', ([committee, user1, user2, user3, user4]) => {
  const wei = BigNumber(2).pow(32).integerValue().toString(10)
  const users = [user1, user2, user3]
  let subject

  before(async () => {
    subject = await CHStockStub.new()
    await subject.init(committee)
  })

  afterEach(async () => {
    const checksum = await subject.checkBalances.call([
      user1, user2, user3, user4
    ])
    checksum.should.be.bignumber.most(2)
  })

  describe('giveShare', () => {
    before(async () => {
      await Promise.all(
        users.map((addr) => subject.giveShares(addr, wei))
      )
      const balances = await Promise.all(
        users.map((addr) => subject.balanceOf(addr))
      )
      for (let balance of balances) {
        assert.equal(balance, wei)
      }
      const ethereumBalances = await Promise.all(
        users.map((addr) => subject.ethereumBalance(addr))
      )
      for (let ethereumBalance of ethereumBalances) {
        assert.equal(ethereumBalance, 0)
      }
    })

    it('should get dividends without burning shares', async () => {
      const actor = users[1]
      const dummy = users[2]
      await subject.dividendsOf(actor)
      const [dividends, dummyDividends] = await Promise.all([
        subject.dividendsOf(actor),
        subject.dividendsOf(dummy)
      ])
      dividends.minus(BigNumber(wei).times(5).div(6).integerValue()).should.be.bignumber.most(1)
      await subject.transfer(dummy, wei, { from: actor })
      await subject.redeemShares({ from: actor })
      await subject.transfer(actor, wei, { from: dummy })
      const [
        afterDividends,
        afterDummyDividends,
        afterEthereumBalance,
        afterDummyEthereumBalance
      ] = await Promise.all([
        subject.dividendsOf(actor),
        subject.dividendsOf(dummy),
        subject.ethereumBalance(actor),
        subject.ethereumBalance(dummy)
      ])

      afterDividends.should.be.bignumber.equal(0)
      afterDummyDividends.should.be.bignumber.equal(dummyDividends)
      afterEthereumBalance.should.be.bignumber.equal(dividends)
      afterDummyEthereumBalance.should.be.bignumber.equal(0)
    })
  })
})
