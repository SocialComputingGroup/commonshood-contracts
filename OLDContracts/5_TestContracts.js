const testing = true;

const crowdsaleFactoryTester = artifacts.require("./CrowdsaleFactoryTester.sol");

module.exports = function(deployer, _, accounts) {
    if (testing) {
      const account = accounts[0];
      deployer.deploy(crowdsaleFactoryTester, {from : account});
    }
};