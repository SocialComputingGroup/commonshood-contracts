module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    ganache: {
      host: "localhost",
      port: 7545,
      network_id: "5777"
    },
    cceth: {
      host: "cceth.di.unito.it",
      port: 8545,
      network_id: 456719,
      from: "0x007ccffb7916f37f7aeef05e8096ecfbe55afc2f",
      gas: 4612388
    },
    rinkeby: {
      host: "localhost", // needs geth running on rinkeby
      port: 8545,
      from: "0xbAAfa3f6438a0ea1E264b1D008913189b392f730", // default address to use for any transaction Truffle makes during migrations
      network_id: 4,
      gas: 4612388
    },
    main: {
      host: "localhost", // needs geth running on mainnet
      port: 8545,
      from: "YOUR_MAINNET_ADDRESS", // default address to use for any transaction Truffle makes during migrations
      network_id: 1,
      gas: 4612388
    },
  }
};
