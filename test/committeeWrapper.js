const Ethername = artifacts.require('./lib/Ethername.sol')
const ChickenHunt = artifacts.require('./test/ChickenHuntStub.sol')
const CHCommitteeWrapper = artifacts.require('./CHCommitteeWrapper.sol')
const BigNumber = require('bignumber.js')
const helpers = require('./helpers.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()
const UINT256MAX = helpers.uint256Max
const UINT32MAX = helpers.uint32Max
const UINT16MAX = helpers.uint16Max
let petLength = 3
let itemLength = 2

contract('CommitteeWrapper', ([committee, otherUser, _new, somebody, tokenAddress]) => {
  let chickenHunt, subject

  before(async () => {
    chickenHunt = await ChickenHunt.new()
    subject = await CHCommitteeWrapper.new(chickenHunt.address)
    await chickenHunt.init(tokenAddress)
    await chickenHunt.setCommittee(subject.address)
  })

  describe('callFor', () => {
    const name = web3.fromAscii('chickenhunt')
    let ethername, validInputs

    before(async () => {
      ethername = await Ethername.new()
      await ethername.rawRegister(name)
      await ethername.rawTransfer(chickenHunt.address, name)
      const nameOwner = await ethername.rawOwnerOf(name)
      nameOwner.should.be.equal(chickenHunt.address)

      validInputs = [
        ethername.address,
        60000,
        ethername.contract.rawTransfer.getData(otherUser, name)
      ]
    })

    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.callFor(...validInputs, { from: somebody })
        )
      })
    })

    describe('when sender is committee', () => {
      it('should work', async () => {
        await subject.callFor(...validInputs, { from: committee })

        const nameOwner = await ethername.rawOwnerOf(name)
        nameOwner.should.be.equal(otherUser)
      })
    })
  })

  describe('addPet', () => {
    const minValid = [0, 0, 0, 0, 0, 1]
    const maxValid = [UINT256MAX, UINT256MAX, UINT256MAX, UINT256MAX, UINT256MAX, UINT32MAX]

    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.addPet(...minValid, { from: otherUser })
        )
      })
    })

    describe('when sender is committee', () => {
      describe('when max is zero', () => {
        it('reverts', async () => {
          let _inputs = minValid.slice()
          _inputs[5] = 0
          await helpers.assertRevert(
            subject.addPet(..._inputs, { from: committee })
          )
        })
      })

      describe('when max is greater than uint32 - 1', () => {
        it('reverts', async () => {
          let _inputs = minValid.slice()
          _inputs[5] = 2 ** 32
          await helpers.assertRevert(
            subject.addPet(..._inputs, { from: committee })
          )
        })
      })

      describe('when minValid', () => {
        it('should work', async () => {
          let _inputs = minValid
          await subject.addPet(..._inputs, {
            from: committee
          })
          petLength += 1

          const pet = await chickenHunt.pets(petLength - 1)
          pet[0].should.be.bignumber.equal(_inputs[0])
          pet[1].should.be.bignumber.equal(_inputs[1])
          pet[2].should.be.bignumber.equal(_inputs[2])
          pet[3].should.be.bignumber.equal(_inputs[3])
          pet[4].should.be.bignumber.equal(_inputs[4])
          pet[5].should.be.bignumber.equal(_inputs[5])
        })
      })

      describe('when maxValid', () => {
        it('should work', async () => {
          let _inputs = maxValid
          await subject.addPet(..._inputs, {
            from: committee
          })
          petLength += 1

          const pet = await chickenHunt.pets(petLength - 1)
          pet[0].should.be.bignumber.equal(_inputs[0])
          pet[1].should.be.bignumber.equal(_inputs[1])
          pet[2].should.be.bignumber.equal(_inputs[2])
          pet[3].should.be.bignumber.equal(_inputs[3])
          pet[4].should.be.bignumber.equal(_inputs[4])
          pet[5].should.be.bignumber.equal(_inputs[5])
        })
      })
    })
  })

  describe('changePet', () => {
    let petId
    const minValid = [0, 0, 2]
    const maxValid = [UINT256MAX, UINT256MAX, UINT32MAX]

    before(async () => {
      await subject.addPet(0, 0, 0, 0, 0, 2, { from: committee })
      petLength += 1
      petId = petLength - 1
    })

    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.changePet(petId, ...minValid, { from: otherUser })
        )
      })
    })

    describe('when sender is committee', () => {
      describe('when max is less than before', () => {
        it('reverts', async () => {
          let _inputs = minValid.slice()
          _inputs[2] -= 1
          await helpers.assertRevert(
            subject.changePet(petId, ..._inputs, { from: committee })
          )
        })
      })

      describe('when max is greater than uint32 - 1', () => {
        it('reverts', async () => {
          let _inputs = minValid.slice()
          _inputs[2] = 2 ** 32
          await helpers.assertRevert(
            subject.changePet(petId, ..._inputs, { from: committee })
          )
        })
      })

      describe('when pet is not exist', () => {
        it('reverts', async () => {
          let _inputs = minValid.slice()
          await helpers.assertRevert(
            subject.changePet(petLength, ..._inputs, { from: committee })
          )
        })
      })

      describe('when minValid', () => {
        it('should work', async () => {
          let _inputs = minValid
          await subject.changePet(petId, ..._inputs, {
            from: committee
          })

          const pet = await chickenHunt.pets(petId)
          assert.equal(pet[3], _inputs[0])
          assert.equal(pet[4], _inputs[1])
          assert.equal(pet[5], _inputs[2])
        })
      })

      describe('when maxValid', () => {
        it('should work', async () => {
          let _inputs = maxValid
          await subject.changePet(petId, ..._inputs, {
            from: committee
          })

          const pet = await chickenHunt.pets(petId)
          pet[3].should.be.bignumber.equal(_inputs[0])
          pet[4].should.be.bignumber.equal(_inputs[1])
          pet[5].should.be.bignumber.equal(_inputs[2])
        })
      })
    })
  })

  describe('addItem', () => {
    const minValid = [0, 0, 0, 0]
    const maxValid = [UINT16MAX, UINT16MAX, UINT16MAX, UINT256MAX]

    describe('when sender is not user', () => {
      describe('when sender is not committee', () => {
        it('reverts', async () => {
          await helpers.assertRevert(
            subject.addItem(...minValid, { from: otherUser })
          )
        })
      })
    })

    describe('when sender is user', () => {
      before(async () => {
        await chickenHunt.join({ from: otherUser })
      })

      describe('when sender is not committee', () => {
        it('reverts', async () => {
          await helpers.assertRevert(
            subject.addItem(...minValid, { from: otherUser })
          )
        })
      })

      describe('when sender is committee', () => {
        describe('when huntingMultiplier is greater than uint16 - 1', () => {
          it('reverts', async () => {
            let _inputs = minValid.slice()
            _inputs[0] = BigNumber(UINT16MAX).plus(1).toString(10)
            await helpers.assertRevert(
              subject.addItem(..._inputs, { from: committee })
            )
          })
        })

        describe('when offenseMultiplier is greater than uint16 - 1', () => {
          it('reverts', async () => {
            let _inputs = minValid.slice()
            _inputs[1] = BigNumber(UINT16MAX).plus(1).toString(10)
            await helpers.assertRevert(
              subject.addItem(..._inputs, { from: committee })
            )
          })
        })

        describe('when defenseMultiplier is greater than uint16 - 1', () => {
          it('reverts', async () => {
            let _inputs = minValid.slice()
            _inputs[2] = BigNumber(UINT16MAX).plus(1).toString(10)
            await helpers.assertRevert(
              subject.addItem(..._inputs, { from: committee })
            )
          })
        })

        describe('when minValid', () => {
          it('should work', async () => {
            let _inputs = minValid.slice()
            await subject.addItem(..._inputs, {
              from: committee
            })
            const itemId = itemLength
            itemLength += 1

            const item = await chickenHunt.items(itemId)
            item[0].should.be.equal(subject.address)
            item[1].should.be.bignumber.equal(_inputs[0])
            item[2].should.be.bignumber.equal(_inputs[1])
            item[3].should.be.bignumber.equal(_inputs[2])
            item[4].should.be.bignumber.equal(_inputs[3])
          })
        })

        describe('when maxValid', () => {
          let duration = 60 * 60 * 24
          let beforeStats
          let beforeChicken

          before(async () => {
            await helpers.increaseTime(duration)

            let _res = await Promise.all([
              chickenHunt.detailsOf(subject.address),
              chickenHunt.chickenOf(subject.address)
            ])
            beforeStats = _res[0]
            beforeChicken = _res[1]
          })

          it('should work', async () => {
            let _inputs = maxValid.slice()
            await subject.addItem(..._inputs, {
              from: committee
            })
            const itemId = itemLength
            itemLength += 1

            const item = await chickenHunt.items(itemId)
            item[0].should.be.equal(subject.address)
            item[1].should.be.bignumber.equal(_inputs[0])
            item[2].should.be.bignumber.equal(_inputs[1])
            item[3].should.be.bignumber.equal(_inputs[2])
            item[4].should.be.bignumber.equal(_inputs[3])

            const [afterStats, afterChicken] = await Promise.all([
              chickenHunt.detailsOf(subject.address),
              chickenHunt.chickenOf(subject.address)
            ])
            afterStats[0][1].should.be.bignumber.equal(
              BigNumber(beforeStats[0][1]).plus(_inputs[0]).toString(10)
            )
            afterStats[1][1].should.be.bignumber.equal(
              BigNumber(beforeStats[1][1]).plus(_inputs[1]).toString(10)
            )
            afterStats[2][1].should.be.bignumber.equal(
              BigNumber(beforeStats[2][1]).plus(_inputs[2]).toString(10)
            )
            afterStats[6].should.be.bignumber.equal(beforeChicken)
            afterStats[7].minus(
              BigNumber(beforeStats[7]).plus(duration))
              .should.be.bignumber.most(1)
            afterChicken.should.be.bignumber.equal(beforeChicken)
          })
        })
      })

      describe('withdraw', () => {
        let ethereumBalance

        before(async () => {
          await subject.addItem(0, 0, 0, '10000000000000000')
          const itemId = itemLength
          itemLength += 1
          await chickenHunt.join({ from: somebody })
          await chickenHunt.buyItem(itemId, { from: somebody, value: '12000000000000000' })
          ethereumBalance = await chickenHunt.ethereumBalance(subject.address)
          ethereumBalance.should.be.bignumber.greaterThan(0)
        })

        it('should transfer ether to committee', async() => {
          const beforeBalance = web3.eth.getBalance(committee)
          const gas = await subject.withdraw.estimateGas()
          console.log(1)
          await subject.withdraw()
          console.log(2)
          const ethereumBalance = await chickenHunt.ethereumBalance(subject.address)
          const afterBalance = await web3.eth.getBalance(committee)

          ethereumBalance.should.be.bignumber.equal(0)
          afterBalance.should.be.bignumber.greaterThan(beforeBalance)
        })
      })
    })
  })

  describe('setDepot', () => {
    const current = ['50000000000000000', 9]
    const minValid = [0, current[1]]
    const maxValid = [UINT256MAX, UINT256MAX]

    before(async () => {
      await subject.setDepot('50000000000000000', 9, { from: committee })
    })

    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.setDepot(...minValid, { from: otherUser })
        )
      })
    })

    describe('when sender is committee', () => {
      describe('when max is less than before', () => {
        it('reverts', async () => {
          let _inputs = minValid.slice()
          _inputs[1] -= 1
          await helpers.assertRevert(
            subject.setDepot(..._inputs, { from: committee })
          )
        })
      })

      describe('when minValid', () => {
        it('should work', async () => {
          let _inputs = minValid
          await subject.setDepot(..._inputs, {
            from: committee
          })
          const depot = await chickenHunt.depot()
          assert.equal(depot[0], _inputs[0])
          assert.equal(depot[1], _inputs[1])
        })
      })

      describe('when maxValid', () => {
        it('should work', async () => {
          let _inputs = maxValid
          await subject.setDepot(..._inputs, {
            from: committee
          })
          const depot = await chickenHunt.depot()
          depot[0].should.be.bignumber.equal(_inputs[0])
          depot[1].should.be.bignumber.equal(_inputs[1])
        })
      })
    })
  })

  describe('setConfiguration', () => {
    const minValid = [0, 0, 99, 0, 0, 9]
    const maxValid = [UINT256MAX, UINT256MAX, UINT32MAX, UINT256MAX, UINT256MAX, UINT32MAX]

    before(async () => {
      await subject.setConfiguration(
        100,
        10000000000000,
        99,
        100000,
        100000000000,
        9,
        { from: committee }
      )
    })

    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.setConfiguration(...minValid, { from: otherUser })
        )
      })
    })

    describe('when sender is committee', () => {
      describe('when maxA is less than before', () => {
        it('reverts', async () => {
          let _inputs = minValid.slice()
          _inputs[2] -= 1
          await helpers.assertRevert(
            subject.setConfiguration(..._inputs, { from: committee })
          )
        })
      })

      describe('when maxB is less than before', () => {
        it('reverts', async () => {
          let _inputs = minValid.slice()
          _inputs[5] -= 1
          await helpers.assertRevert(
            subject.setConfiguration(..._inputs, { from: committee })
          )
        })
      })

      describe('when maxA is greater than uint32 - 1', () => {
        it('reverts', async () => {
          let _inputs = minValid.slice()
          _inputs[2] = 2 ** 32
          await helpers.assertRevert(
            subject.setConfiguration(..._inputs, { from: committee })
          )
        })
      })

      describe('when maxB is greater than uint32 - 1', () => {
        it('reverts', async () => {
          let _inputs = minValid.slice()
          _inputs[5] = 2 ** 32
          await helpers.assertRevert(
            subject.setConfiguration(..._inputs, { from: committee })
          )
        })
      })

      describe('when minValid', () => {
        it('should work', async () => {
          let _inputs = minValid
          await subject.setConfiguration(..._inputs, {
            from: committee
          })
          const [typeA, typeB] = await Promise.all([
            chickenHunt.typeA(),
            chickenHunt.typeB()
          ])
          assert.equal(typeA[0], _inputs[0])
          assert.equal(typeA[1], _inputs[1])
          assert.equal(typeA[2], _inputs[2])
          assert.equal(typeB[0], _inputs[3])
          assert.equal(typeB[1], _inputs[4])
          assert.equal(typeB[2], _inputs[5])
        })
      })

      describe('when maxValid', () => {
        it('should work', async () => {
          let _inputs = maxValid
          await subject.setConfiguration(..._inputs, {
            from: committee
          })
          const [typeA, typeB] = await Promise.all([
            chickenHunt.typeA(),
            chickenHunt.typeB()
          ])
          typeA[0].should.be.bignumber.equal(_inputs[0])
          typeA[1].should.be.bignumber.equal(_inputs[1])
          typeA[2].should.be.bignumber.equal(_inputs[2])
          typeB[0].should.be.bignumber.equal(_inputs[3])
          typeB[1].should.be.bignumber.equal(_inputs[4])
          typeB[2].should.be.bignumber.equal(_inputs[5])
        })
      })
    })
  })

  describe('setDistribution', () => {
    let _valid = [0, 33, 33, 34]

    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.setDistribution(..._valid, { from: otherUser })
        )
      })
    })

    describe('when sender is committee', () => {
      it('should set distribution', async () => {
        await subject.setDistribution(..._valid, {
          from: committee
        })

        const [
          dividendRate,
          altarCut,
          store,
          devCut
        ] = await Promise.all([
          chickenHunt.dividendRate(),
          chickenHunt.altarCut(),
          chickenHunt.store(),
          chickenHunt.devCut()
        ])
        assert.equal(dividendRate, _valid[0])
        assert.equal(altarCut, _valid[1])
        assert.equal(store[1], _valid[2])
        assert.equal(devCut, _valid[3])
      })

      describe('when storeCut is zero', () => {
        it('reverts', async () => {
          await helpers.assertRevert(
            subject.setDistribution(...[34, 33, 0, 33], {
              from: committee
            })
          )
        })
      })

      describe('when total is not equal to 100', () => {
        it('reverts', async () => {
          await helpers.assertRevert(
            subject.setDistribution(...[25, 26, 25, 25], {
              from: committee
            })
          )
          await helpers.assertRevert(
            subject.setDistribution(...[25, 24, 25, 25], {
              from: committee
            })
          )
        })
      })
    })
  })

  describe('setCooldownTime', () => {
    let _newCooldown = 1987

    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.setCooldownTime(_newCooldown, { from: otherUser })
        )
      })
    })

    describe('when sender is committee', () => {
      it('should set cooldown', async () => {
        await subject.setCooldownTime(_newCooldown, {
          from: committee
        })

        const res = await chickenHunt.cooldownTime()
        assert.equal(res, _newCooldown)
      })
    })
  })

  describe('setNameAndSymbol', () => {
    let _newName = 'newname'
    let _newSymbol = 'newsymbol'

    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.setNameAndSymbol(_newName, _newSymbol, { from: otherUser })
        )
      })
    })

    describe('when sender is committee', () => {
      it('should change name and symbol', async () => {
        await subject.setNameAndSymbol(_newName, _newSymbol, {
          from: committee
        })

        let newName, newSymbol
        [newName, newSymbol] = await Promise.all(
          [chickenHunt.name(), chickenHunt.symbol()]
        )
        assert.equal(newName, _newName)
        assert.equal(newSymbol, _newSymbol)
      })
    })
  })

  describe('setDeveloper', () => {
    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.setDeveloper(_new, { from: otherUser })
        )
      })
    })

    describe('when sender is committee', () => {
      it('should change developer', async () => {
        await subject.setDeveloper(_new, {
          from: committee
        })

        const newDeveloper = await chickenHunt.developer()
        assert.equal(newDeveloper, _new)
      })

      it('should withdraw and reset devFee', async () => {
        let _devFee = 1987
        await chickenHunt.setDevFee(_devFee)
        let _balance = await chickenHunt.ethereumBalance(_new)
        assert.equal(_balance, 0)
        await subject.setDeveloper(committee, { from: committee })

        let devFee, balance
        [devFee, balance] = await Promise.all(
          [chickenHunt.devFee(), chickenHunt.ethereumBalance(_new)]
        )
        assert.equal(devFee, 0)
        assert.equal(balance, _devFee)
      })
    })
  })

  describe('withdrawDevFee', () => {
    it('should work with somebody', async () => {
      const developer = await chickenHunt.developer()
      let _devFee = 1987
      await chickenHunt.setDevFee(_devFee)
      let _balance = await chickenHunt.ethereumBalance(developer)
      await chickenHunt.withdrawDevFee({ from: somebody })

      let devFee, balance
      [devFee, balance] = await Promise.all(
        [chickenHunt.devFee(), chickenHunt.ethereumBalance(developer)]
      )
      assert.equal(devFee, 0)
      assert.equal(balance, Number(_balance) + _devFee)
    })
  })

  describe('setCommittee', () => {
    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.setCommittee(_new, {
            from: otherUser
          })
        )
      })
    })

    describe('when sender is committee', () => {
      it('should change committee', async () => {
        await subject.setCommittee(_new, {
          from: committee
        })

        const newCommittee = await subject.committee()
        assert.equal(newCommittee, _new)
      })
    })
  })
})

contract('CommitteeWrapper - callFor flaw patch', ([committee, badman, _new, somebody, tokenAddress]) => {
  let subject, balance
  const initialBalance = '9999999999999999999'

  before(async () => {
    ethername = await Ethername.new()
    chickenHunt = await ChickenHunt.new()
    subject = await CHCommitteeWrapper.new(chickenHunt.address)
    await chickenHunt.init(tokenAddress)
    await chickenHunt.setCommittee(subject.address)
    await chickenHunt.join({ from: somebody })
    await chickenHunt.buyDepots(8, { from: somebody, value: initialBalance })
    balance = await web3.eth.getBalance(chickenHunt.address)
    assert.notEqual(balance, 0)
  })

  describe('user', () => {
    it('committee could use contract ether', async () => {
      const beforeBalance = await web3.eth.getBalance(badman)
      let inputs = [
        badman,
        100000,
        null
      ]
      await subject.callFor(...inputs, { from: committee })
      const [ afterBalance, contractBalance ] = await Promise.all([
        web3.eth.getBalance(badman),
        web3.eth.getBalance(chickenHunt.address)
      ])

      afterBalance.should.be.bignumber.equal(beforeBalance)
      contractBalance.should.be.bignumber.equal(balance)
    })

    it('committee could use msg.sender-ether', async () => {
      const selfEther = 1874
      const beforeBalance = await web3.eth.getBalance(badman)
      let inputs = [
        badman,
        100000,
        null
      ]
      await subject.callFor(...inputs, { from: committee, value: selfEther })
      const [ afterBalance, contractBalance ] = await Promise.all([
        web3.eth.getBalance(badman),
        web3.eth.getBalance(chickenHunt.address)
      ])

      afterBalance.minus(beforeBalance).should.be.bignumber.equal(selfEther)
      contractBalance.should.be.bignumber.equal(initialBalance)
    })
  })

})
