const daoFactory = artifacts.require("./DAOFactory.sol");

module.exports = function(deployer, _, accounts) {
    const account = accounts[0];
    deployer.deploy(daoFactory, {from : account});
};