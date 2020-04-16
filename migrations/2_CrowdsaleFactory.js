const crowsaleFactory = artifacts.require("./CrowdsaleFactory.sol");

module.exports = function(deployer, _, accounts) {
    const account = accounts[0];
    deployer.deploy(crowsaleFactory, {from : account});
};