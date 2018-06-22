let ChickenTokenDelegator = artifacts.require('./ChickenTokenDelegator.sol')
let ChickenHunt = artifacts.require('./ChickenHunt.sol')

module.exports = async function (deployer) {
  await Promise.all([
    deployer.deploy(ChickenHunt),
    deployer.deploy(ChickenTokenDelegator)
  ])

  const [ _chickenHunt, _chickenTokenDelegator ] = await Promise.all([
    ChickenHunt.deployed(),
    ChickenTokenDelegator.deployed()
  ])

  await Promise.all([
    _chickenHunt.init(_chickenTokenDelegator.address),
    _chickenTokenDelegator.setChickenHunt(_chickenHunt.address)
  ])
}
