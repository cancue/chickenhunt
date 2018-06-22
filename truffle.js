module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*'
    }
  },
  // mocha: {
  // reporter: 'eth-gas-reporter',
  // reporterOptions: {
  // currency: 'KRW',
  // gasPrice: 21
  // }
  // },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    evmVersion: 'byzantium'
  }
}
