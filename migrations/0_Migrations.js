const migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer, _, accounts) {
  const account = accounts[0];
  deployer.deploy(migrations, {from : account});
};
