const ChickenHuntStub = artifacts.require('./test/ChickenHuntStub.sol')
const helpers = require('./helpers.js')
require('chai')
  .use(require('chai-bignumber')(web3.BigNumber))
  .should()

contract('MaxTest', ([committee, user]) => {
  let subject

  before(async () => {
    subject = await ChickenHuntStub.new()
  })

  it('join should set valid default value', async () => {
    await subject.setMax({ from: user })
    const details = await subject.detailsOf.call(user)
    details[0].should.be.lengthOf(2)
    details[1].should.be.lengthOf(2)
    details[2].should.be.lengthOf(2)
    details[3].should.be.lengthOf(4)
    details[4].should.be.lengthOf(100)
    details[5].should.be.bignumber.equal(helpers.uint256Max)
    details[6].should.be.bignumber.equal(helpers.uint256Max)
    details[7].should.be.bignumber.equal(helpers.uint256Max)
    details[8].should.be.bignumber.equal(helpers.uint256Max)
  })
})
