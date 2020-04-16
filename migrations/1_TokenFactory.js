const tokenFactory = artifacts.require("./TokenFactory.sol");

module.exports = function(deployer, _, accounts) {
    const account = accounts[0];
    deployer.deploy(tokenFactory, {from : account});
};
