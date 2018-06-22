const Ethername = artifacts.require('./lib/Ethername.sol')
const ChickenHunt = artifacts.require('./test/ChickenHuntStub.sol')
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

contract('Committee', ([committee, otherUser, _new, anybody]) => {
  let subject

  before(async () => {
    subject = await ChickenHunt.new()
    await subject.init(committee)
  })

  describe('callFor', () => {
    const name = web3.fromAscii('chickenhunt')
    let ethername, validInputs

    before(async () => {
      ethername = await Ethername.new()
      await ethername.rawRegister(name)
      await ethername.rawTransfer(subject.address, name)
      const nameOwner = await ethername.rawOwnerOf(name)
      nameOwner.should.be.equal(subject.address)

      validInputs = [
        ethername.address,
        0,
        60000,
        ethername.contract.rawTransfer.getData(otherUser, name)
      ]
    })

    describe('when sender is not committee', () => {
      it('reverts', async () => {
        await helpers.assertRevert(
          subject.callFor(...validInputs, { from: anybody })
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
          const { logs } = await subject.addPet(..._inputs, {
            from: committee
          })
          petLength += 1

          logs.should.be.lengthOf(1)
          logs[0].event.should.be.equal('NewPet')
          logs[0].args.id.should.be.bignumber.equal(petLength - 1)
          logs[0].args.huntingPower.should.be.bignumber.equal(_inputs[0])
          logs[0].args.offensePower.should.be.bignumber.equal(_inputs[1])
          logs[0].args.defense.should.be.bignumber.equal(_inputs[2])
          logs[0].args.chicken.should.be.bignumber.equal(_inputs[3])
          logs[0].args.ethereum.should.be.bignumber.equal(_inputs[4])
          logs[0].args.max.should.be.bignumber.equal(_inputs[5])
          const pet = await subject.pets(petLength - 1)
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
          const { logs } = await subject.addPet(..._inputs, {
            from: committee
          })
          petLength += 1

          logs.should.be.lengthOf(1)
          logs[0].event.should.be.equal('NewPet')
          logs[0].args.id.should.be.bignumber.equal(petLength - 1)
          logs[0].args.huntingPower.should.be.bignumber.equal(_inputs[0])
          logs[0].args.offensePower.should.be.bignumber.equal(_inputs[1])
          logs[0].args.defense.should.be.bignumber.equal(_inputs[2])
          logs[0].args.chicken.should.be.bignumber.equal(_inputs[3])
          logs[0].args.ethereum.should.be.bignumber.equal(_inputs[4])
          logs[0].args.max.should.be.bignumber.equal(_inputs[5])
          const pet = await subject.pets(petLength - 1)
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
          const { logs } = await subject.changePet(petId, ..._inputs, {
            from: committee
          })

          assert.equal(logs.length, 1)
          assert.equal(logs[0].event, 'ChangePet')
          assert.equal(logs[0].args.id, petId)
          assert.equal(logs[0].args.chicken, _inputs[0])
          assert.equal(logs[0].args.ethereum, _inputs[1])
          assert.equal(logs[0].args.max, _inputs[2])
          const pet = await subject.pets(petId)
          assert.equal(pet[3], _inputs[0])
          assert.equal(pet[4], _inputs[1])
          assert.equal(pet[5], _inputs[2])
        })
      })

      describe('when maxValid', () => {
        it('should work', async () => {
          let _inputs = maxValid
          const { logs } = await subject.changePet(petId, ..._inputs, {
            from: committee
          })

          assert.equal(logs.length, 1)
          assert.equal(logs[0].event, 'ChangePet')
          assert.equal(logs[0].args.id, petId)
          logs[0].args.chicken.should.be.bignumber.equal(_inputs[0])
          logs[0].args.ethereum.should.be.bignumber.equal(_inputs[1])
          logs[0].args.max.should.be.bignumber.equal(_inputs[2])
          const pet = await subject.pets(petId)
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
        await subject.join({ from: otherUser })
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
            const { logs } = await subject.addItem(..._inputs, {
              from: committee
            })
            const itemId = itemLength
            itemLength += 1

            assert.equal(logs.length, 1)
            assert.equal(logs[0].event, 'NewItem')
            logs[0].args.id.should.be.bignumber.equal(itemId)
            logs[0].args.huntingMultiplier.should.be.bignumber.equal(_inputs[0])
            logs[0].args.offenseMultiplier.should.be.bignumber.equal(_inputs[1])
            logs[0].args.defenseMultiplier.should.be.bignumber.equal(_inputs[2])
            logs[0].args.ethereum.should.be.bignumber.equal(_inputs[3])
            const item = await subject.items(itemId)
            item[0].should.be.equal(committee)
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
              subject.detailsOf(committee),
              subject.chickenOf(committee)
            ])
            beforeStats = _res[0]
            beforeChicken = _res[1]
          })

          it('should work', async () => {
            let _inputs = maxValid.slice()
            const { logs } = await subject.addItem(..._inputs, {
              from: committee
            })
            const itemId = itemLength
            itemLength += 1

            assert.equal(logs.length, 1)
            assert.equal(logs[0].event, 'NewItem')
            assert.equal(logs[0].args.id, itemId)
            logs[0].args.huntingMultiplier.should.be.bignumber.equal(_inputs[0])
            logs[0].args.offenseMultiplier.should.be.bignumber.equal(_inputs[1])
            logs[0].args.defenseMultiplier.should.be.bignumber.equal(_inputs[2])
            logs[0].args.ethereum.should.be.bignumber.equal(_inputs[3])
            const item = await subject.items(itemId)
            item[0].should.be.equal(committee)
            item[1].should.be.bignumber.equal(_inputs[0])
            item[2].should.be.bignumber.equal(_inputs[1])
            item[3].should.be.bignumber.equal(_inputs[2])
            item[4].should.be.bignumber.equal(_inputs[3])

            const [afterStats, afterChicken] = await Promise.all([
              subject.detailsOf(committee),
              subject.chickenOf(committee)
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
          const { logs } = await subject.setDepot(..._inputs, {
            from: committee
          })
          assert.equal(logs.length, 1)
          assert.equal(logs[0].event, 'SetDepot')
          assert.equal(logs[0].args.ethereum, _inputs[0])
          assert.equal(logs[0].args.max, _inputs[1])
          const depot = await subject.depot()
          assert.equal(depot[0], _inputs[0])
          assert.equal(depot[1], _inputs[1])
        })
      })

      describe('when maxValid', () => {
        it('should work', async () => {
          let _inputs = maxValid
          const { logs } = await subject.setDepot(..._inputs, {
            from: committee
          })
          assert.equal(logs.length, 1)
          assert.equal(logs[0].event, 'SetDepot')
          logs[0].args.ethereum.should.be.bignumber.equal(_inputs[0])
          logs[0].args.max.should.be.bignumber.equal(_inputs[1])
          const depot = await subject.depot()
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
          const { logs } = await subject.setConfiguration(..._inputs, {
            from: committee
          })
          assert.equal(logs.length, 1)
          assert.equal(logs[0].event, 'SetConfiguration')
          assert.equal(logs[0].args.chickenA, _inputs[0])
          assert.equal(logs[0].args.ethereumA, _inputs[1])
          assert.equal(logs[0].args.maxA, _inputs[2])
          assert.equal(logs[0].args.chickenB, _inputs[3])
          assert.equal(logs[0].args.ethereumB, _inputs[4])
          assert.equal(logs[0].args.maxB, _inputs[5])
          const [typeA, typeB] = await Promise.all([
            subject.typeA(),
            subject.typeB()
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
          const { logs } = await subject.setConfiguration(..._inputs, {
            from: committee
          })
          assert.equal(logs.length, 1)
          assert.equal(logs[0].event, 'SetConfiguration')
          logs[0].args.chickenA.should.be.bignumber.equal(_inputs[0])
          logs[0].args.ethereumA.should.be.bignumber.equal(_inputs[1])
          logs[0].args.maxA.should.be.bignumber.equal(_inputs[2])
          logs[0].args.chickenB.should.be.bignumber.equal(_inputs[3])
          logs[0].args.ethereumB.should.be.bignumber.equal(_inputs[4])
          logs[0].args.maxB.should.be.bignumber.equal(_inputs[5])
          const [typeA, typeB] = await Promise.all([
            subject.typeA(),
            subject.typeB()
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
        const { logs } = await subject.setDistribution(..._valid, {
          from: committee
        })

        assert.equal(logs.length, 1)
        assert.equal(logs[0].event, 'SetDistribution')
        assert.equal(logs[0].args.dividendRate, _valid[0])
        assert.equal(logs[0].args.altarCut, _valid[1])
        assert.equal(logs[0].args.storeCut, _valid[2])
        assert.equal(logs[0].args.devCut, _valid[3])
        const [
          dividendRate,
          altarCut,
          store,
          devCut
        ] = await Promise.all([
          subject.dividendRate(),
          subject.altarCut(),
          subject.store(),
          subject.devCut()
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
        const { logs } = await subject.setCooldownTime(_newCooldown, {
          from: committee
        })

        assert.equal(logs.length, 1)
        assert.equal(logs[0].event, 'SetCooldownTime')
        assert.equal(logs[0].args.cooldownTime, _newCooldown)
        const res = await subject.cooldownTime()
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
        const { logs } = await subject.setNameAndSymbol(_newName, _newSymbol, {
          from: committee
        })

        assert.equal(logs.length, 1)
        assert.equal(logs[0].event, 'SetNameAndSymbol')
        assert.equal(logs[0].args.name, _newName)
        assert.equal(logs[0].args.symbol, _newSymbol)
        let newName, newSymbol
        [newName, newSymbol] = await Promise.all(
          [subject.name(), subject.symbol()]
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
        const { logs } = await subject.setDeveloper(_new, {
          from: committee
        })

        assert.equal(logs.length, 1)
        assert.equal(logs[0].event, 'SetDeveloper')
        assert.equal(logs[0].args.developer, _new)
        const newDeveloper = await subject.developer()
        assert.equal(newDeveloper, _new)
      })

      it('should withdraw and reset devFee', async () => {
        let _devFee = 1987
        await subject.setDevFee(_devFee)
        let _balance = await subject.ethereumBalance(_new)
        assert.equal(_balance, 0)
        await subject.setDeveloper(committee, { from: committee })

        let devFee, balance
        [devFee, balance] = await Promise.all(
          [subject.devFee(), subject.ethereumBalance(_new)]
        )
        assert.equal(devFee, 0)
        assert.equal(balance, _devFee)
      })
    })
  })

  describe('withdrawDevFee', () => {
    it('should work with anybody', async () => {
      const developer = await subject.developer()
      let _devFee = 1987
      await subject.setDevFee(_devFee)
      let _balance = await subject.ethereumBalance(developer)
      await subject.withdrawDevFee({ from: anybody })

      let devFee, balance
      [devFee, balance] = await Promise.all(
        [subject.devFee(), subject.ethereumBalance(developer)]
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
        const { logs } = await subject.setCommittee(_new, {
          from: committee
        })

        assert.equal(logs.length, 1)
        assert.equal(logs[0].event, 'SetCommittee')
        assert.equal(logs[0].args.committee, _new)
        const newCommittee = await subject.committee()
        assert.equal(newCommittee, _new)
      })
    })
  })
})
