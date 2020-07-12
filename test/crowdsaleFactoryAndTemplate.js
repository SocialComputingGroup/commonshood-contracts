const CrowdsaleFactory = artifacts.require("./CrowdsaleFactory.sol");
const TokenCrowdsale = artifacts.require("./TokenCrowdsale.sol");
const TokenFactory = artifacts.require("./TokenFactory.sol");
const TokenTemplate = artifacts.require("./TokenTemplate.sol");
const util = require('util'); // this is imported to allow use of util.inspect when you want to console.log a circular js object

/**
 * @dev this function just moves forward in time the ganache blockchain
 *      It is useful to test some features that need the passing of time
 *      source: https://medium.com/edgefund/time-travelling-truffle-tests-f581c1964687
 * @param time in milliseconds (like Date.now())
 */
const advanceTime = (time) => {
  return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [time],
          id: new Date().getTime()
      }, (err, result) => {
          if (err) { return reject(err); }
          return resolve(result);
      });
  });
};

const CrowdsaleStatus = { //matching TokenCrowdsale Status enum
  RUNNING : 0, STOPPED: 1, LOCKED: 2,
};

contract("CrowdsaleFactory", async accounts => {
  const tokenToAccept = {
    name: "Crowdsale Accept Token",
    symbol: "CRACC",
    decimals: 18,
    logoURL:
      "https://apollo-uploads-las.s3.amazonaws.com/1442324623/atlanta-hawks-logo-944556.png",
    logoHash: web3.utils.toHex(
      "0x4D021B157A49F472A48AB02A1F2F6E2986C169A7C78CC94179EDAEBD5E96E8E4"
    ), // sha256 hash
    contractHash: web3.utils.toHex(
      "0x4D021B157A49F472A48AB02A1F2F6E2986C169A7C78CC94179EDAEBD5E96E8E4"
    ),
    supply: 100000
  },
  tokenToGive = {
    name: "Crowdsale Give Token",
    symbol: "CRGIV",
    decimals: 2,
    logoURL:
      "https://apollo-uploads-las.s3.amazonaws.com/1442324623/atlanta-hawks-logo-944556.png",
    logoHash: web3.utils.toHex(
      "0x4D021B157A49F472A48AB02A1F2F6E2986C169A7C78CC94179EDAEBD5E96E8E4"
    ), // sha256 hash
    contractHash: web3.utils.toHex(
      "0x4D021B157A49F472A48AB02A1F2F6E2986C169A7C78CC94179EDAEBD5E96E8E4"
    ),
    supply: 100000
  };

  const span = 864000;

  //initialization data
  const crowdsaleMetadata = [
    "My Crowdsale Title",
    "My Crowdsale Description",
    "5eec64bd5aedd795eacdc1d36dc9699a",
    "d45f57a1368f621d23da005d1fd7fc85",
  ];
  const crowdsale = {
    metadata: crowdsaleMetadata,
    acceptRatio: 1,
    giveRatio: 1,
    maxCap: 100
  };
  //======================


  const owner = accounts[0];
  const otherUser = accounts[1];

  before(async function() {
    try {
      await web3.eth.personal.unlockAccount(owner, "", 10000);
      await web3.eth.personal.unlockAccount(otherUser, "", 10000);
    } catch (error) {
      console.warn(`error in unlocking wallet: ${JSON.stringify(error)}`);
    }
  });

  describe("Crowdsale Creation", _ => {
    let tokenToAcceptAddr;
    let tokenToGiveAddr;
    let crowdsaleAddress;

    it("Creates Crowdsale", async () => {
      const CrowdsaleFactoryInstance = await CrowdsaleFactory.new();
      const TokenFactoryInstance = await TokenFactory.new();
      
      
      try {
        let transaction = await TokenFactoryInstance.createToken(
          tokenToAccept.name,
          tokenToAccept.symbol,
          tokenToAccept.decimals,
          tokenToAccept.logoURL,
          tokenToAccept.logoHash,
          tokenToAccept.supply,
          tokenToAccept.contractHash,
          { from: owner }
        );
        tokenToAcceptAddr = transaction.receipt.logs[0].args._contractAddress;

        transaction = await TokenFactoryInstance.createToken(
          tokenToGive.name,
          tokenToGive.symbol,
          tokenToGive.decimals,
          tokenToGive.logoURL,
          tokenToGive.logoHash,
          tokenToGive.supply,
          tokenToGive.contractHash,
          { from: owner }
        );
        tokenToGiveAddr = transaction.receipt.logs[0].args._contractAddress;
        
        const {acceptRatio, giveRatio, maxCap, metadata } = crowdsale;

        const start = Math.floor(new Date() / 1000);
        //86400000ms === 1day
        const end = Math.floor(new Date() / 1000 + 86400000);  

        transaction = await CrowdsaleFactoryInstance.createCrowdsale(
          tokenToGiveAddr,
          tokenToAcceptAddr,
          start,
          end,
          acceptRatio,
          giveRatio,
          maxCap,
          metadata,
          { from: owner }
        );
        crowdsaleAddress = transaction.receipt.logs[0].args._contractAddress;


        //checking crowdsale data
        const crowdsaleInstance = await TokenCrowdsale.at(crowdsaleAddress);
        assert.equal(await crowdsaleInstance.title(), metadata[0], "Crowdsale props should be consistent");
        assert.equal(await crowdsaleInstance.description(), metadata[1], "Crowdsale props should be consistent");
        assert.equal(await crowdsaleInstance.logoHash(), metadata[2], "Crowdsale props should be consistent");
        assert.equal(await crowdsaleInstance.TOSHash(), metadata[3], "Crowdsale props should be consistent");
        assert.equal(await crowdsaleInstance.owner(), owner, "Crowdsale props should be consistent");
        assert.equal(await crowdsaleInstance.raised(), 0, "Crowdsale props should be consistent");
        assert.equal(await crowdsaleInstance.acceptRatio(), crowdsale.acceptRatio, "Crowdsale props should be consistent");
        assert.equal(await crowdsaleInstance.giveRatio(), crowdsale.giveRatio, "Crowdsale props should be consistent");
        

      } catch (error) {
        assertFailError(error);
      }
    });


    it('Crowdsale should not unlock without funds', async () => {
      const crowdsaleInstance = await TokenCrowdsale.at(crowdsaleAddress);
      assert.equal(await crowdsaleInstance.status(), CrowdsaleStatus.LOCKED, "Crowdsale status should be locked initially");
      
      try{
        await crowdsaleInstance.unlockCrowdsale({ from: owner });
      }catch(error){
        assert.equal(await crowdsaleInstance.status(), CrowdsaleStatus.LOCKED, "Crowdsale status should be still locked");
        return;
      }
      assert(false, "crowdsale should NOT unlock without funds!");
    });


    it('Crowdsale should unlock correctly when it has enough tokenToGive', async() => {
      const tokenToGiveInstance = await TokenTemplate.at(tokenToGiveAddr);
      await tokenToGiveInstance.transfer(crowdsaleAddress, 250, {
          from: owner
      });

      const crowdsaleInstance = await TokenCrowdsale.at(crowdsaleAddress);

      assert.equal(await crowdsaleInstance.status(), CrowdsaleStatus.LOCKED, "Crowdsale status should be locked initially");
      await crowdsaleInstance.unlockCrowdsale({ from: owner });
      assert.equal(await crowdsaleInstance.status(), CrowdsaleStatus.RUNNING, "Crowdsale status should be running after unlock");
    });
  });


  describe("Multiple Crowdsale Creation and Retrival", () => {
    before( async() => {
      const TokenFactoryInstance = await TokenFactory.new();

      let transaction = await TokenFactoryInstance.createToken(
        tokenToAccept.name,
        tokenToAccept.symbol,
        tokenToAccept.decimals,
        tokenToAccept.logoURL,
        tokenToAccept.logoHash,
        tokenToAccept.supply,
        tokenToAccept.contractHash,
        { from: owner }
      );
      tokenToAcceptAddr = transaction.receipt.logs[0].args._contractAddress;

      transaction = await TokenFactoryInstance.createToken(
        tokenToGive.name,
        tokenToGive.symbol,
        tokenToGive.decimals,
        tokenToGive.logoURL,
        tokenToGive.logoHash,
        tokenToGive.supply,
        tokenToGive.contractHash,
        { from: owner }
      );
      tokenToGiveAddr = transaction.receipt.logs[0].args._contractAddress;
    });

    it('Crates multiple crowdsales correctly', async () => {
      const CrowdsaleFactoryInstance = await CrowdsaleFactory.new();
      const {acceptRatio, giveRatio, maxCap, metadata } = crowdsale;
      const start = Math.floor(new Date() / 1000 - 86400000);//86400000ms === 1day
      const end = Math.floor(new Date() / 1000 - 10000);
       
      let crowdsalesAddressesFromFactory = await CrowdsaleFactoryInstance.getAllCrowdsalesAddresses();
      assert.equal(crowdsalesAddressesFromFactory.length, 0, "Initially no address is present");

      let crowdsalesOfUser1 = await CrowdsaleFactoryInstance.getCrowdsalesByOwner(owner);
      assert.equal(crowdsalesOfUser1.length, 0, "Initially no address is present");
      let crowdsalesOfUser2 = await CrowdsaleFactoryInstance.getCrowdsalesByOwner(otherUser);
      assert.equal(crowdsalesOfUser2.length, 0, "Initially no address is present");

      let crowdsalesAddresses = [];
      crowdsalesAddresses.push( await CrowdsaleFactoryInstance.createCrowdsale(
        tokenToGiveAddr,
        tokenToAcceptAddr,
        start,
        end,
        acceptRatio,
        giveRatio,
        maxCap,
        metadata,
        { from: owner },
      ));
      crowdsalesAddresses.push( await CrowdsaleFactoryInstance.createCrowdsale(
        tokenToGiveAddr,
        tokenToAcceptAddr,
        start,
        end,
        acceptRatio,
        giveRatio,
        maxCap,
        metadata,
        { from: owner },
      ));
      crowdsalesAddresses.push( await CrowdsaleFactoryInstance.createCrowdsale(
        tokenToGiveAddr,
        tokenToAcceptAddr,
        start,
        end,
        acceptRatio,
        giveRatio,
        maxCap,
        metadata,
        { from: otherUser }
      ));
      crowdsalesAddresses = crowdsalesAddresses.map( cwd => {
        return cwd.receipt.logs[0].args._contractAddress;
      });

      crowdsalesAddressesFromFactory = await CrowdsaleFactoryInstance.getAllCrowdsalesAddresses();
      assert.equal(crowdsalesAddressesFromFactory.length, crowdsalesAddresses.length, `After creation there are ${crowdsalesAddresses.length} addresses`);
      assert.deepEqual(crowdsalesAddressesFromFactory, crowdsalesAddresses, "addresses must match those expected");

      crowdsalesOfUser1 = await CrowdsaleFactoryInstance.getCrowdsalesByOwner(owner);
      assert.equal(crowdsalesOfUser1.length, 2, "After creation 2 addresses are present");
      assert.deepEqual(crowdsalesOfUser1, crowdsalesAddresses.slice(0,2), "addresses must match those expected");
      crowdsalesOfUser2 = await CrowdsaleFactoryInstance.getCrowdsalesByOwner(otherUser);
      assert.equal(crowdsalesOfUser2.length, 1, "After creation 1 address is present");
      assert.deepEqual(crowdsalesOfUser2, crowdsalesAddresses.slice(2,3), "addresses must match those expected");
    });


  });


  describe("Crowdsale error checking", () => {
    before( async() => {
      const TokenFactoryInstance = await TokenFactory.new();

      let transaction = await TokenFactoryInstance.createToken(
        tokenToAccept.name,
        tokenToAccept.symbol,
        tokenToAccept.decimals,
        tokenToAccept.logoURL,
        tokenToAccept.logoHash,
        tokenToAccept.supply,
        tokenToAccept.contractHash,
        { from: owner }
      );
      tokenToAcceptAddr = transaction.receipt.logs[0].args._contractAddress;

      transaction = await TokenFactoryInstance.createToken(
        tokenToGive.name,
        tokenToGive.symbol,
        tokenToGive.decimals,
        tokenToGive.logoURL,
        tokenToGive.logoHash,
        tokenToGive.supply,
        tokenToGive.contractHash,
        { from: owner }
      );
      tokenToGiveAddr = transaction.receipt.logs[0].args._contractAddress;
    });

    it("Trying to join not started yet Crowdsale", async () => {
      //creating crowdsale starting in the future:
      const CrowdsaleFactoryInstance = await CrowdsaleFactory.deployed();
      const {acceptRatio, giveRatio, maxCap, metadata} = crowdsale;
      const start = Math.floor(new Date() / 1000 + 86400000);//86400000ms === 1day
      const end = Math.floor(new Date() / 1000 + (2*86400000));  
      transaction = await CrowdsaleFactoryInstance.createCrowdsale(
        tokenToGiveAddr,
        tokenToAcceptAddr,
        start,
        end,
        acceptRatio,
        giveRatio,
        maxCap,
        metadata,
        { from: owner }
      );
      const futureStartingCrowdsaleAddress = transaction.receipt.logs[0].args._contractAddress;
      const crowdsaleInstance = await TokenCrowdsale.at(futureStartingCrowdsaleAddress, {from: owner});

      //unlocking crowdsale
      const tokenToGiveInstance = await TokenTemplate.at(tokenToGiveAddr);
      await tokenToGiveInstance.transfer(futureStartingCrowdsaleAddress, 250, {
          from: owner
      });
      await crowdsaleInstance.unlockCrowdsale({ from: owner });

      const tokenInstance = await TokenTemplate.at(tokenToAcceptAddr, {from: owner });

      await tokenInstance.approve(futureStartingCrowdsaleAddress, 100, { from: otherUser });

      try {
        await crowdsaleInstance.joinCrowdsale(futureStartingCrowdsaleAddress, { from: otherUser });
      } catch (error) {
        assert(error.message.includes("Crowdsale start must be passed"), "join failed but not for expected reason");
        return;
      }
    });


    it("Trying to join already ended Crowdsale", async () => {
      //creating crowdsale starting in the future:
      const CrowdsaleFactoryInstance = await CrowdsaleFactory.deployed();
      const {acceptRatio, giveRatio, maxCap, metadata } = crowdsale;
      const start = Math.floor(new Date() / 1000 - 86400000);//86400000ms === 1day
      const end = Math.floor(new Date() / 1000 - 10000);  
      transaction = await CrowdsaleFactoryInstance.createCrowdsale(
        tokenToGiveAddr,
        tokenToAcceptAddr,
        start,
        end,
        acceptRatio,
        giveRatio,
        maxCap,
        metadata,
        { from: owner }
      );
      const alreadyEndedCrowdsaleAddress = transaction.receipt.logs[0].args._contractAddress;
      const crowdsaleInstance = await TokenCrowdsale.at(alreadyEndedCrowdsaleAddress, {from: owner});

      //unlocking crowdsale
      const tokenToGiveInstance = await TokenTemplate.at(tokenToGiveAddr);
      await tokenToGiveInstance.transfer(alreadyEndedCrowdsaleAddress, 250, {
          from: owner
      });
      await crowdsaleInstance.unlockCrowdsale({ from: owner });

      const tokenInstance = await TokenTemplate.at(tokenToAcceptAddr, {from: owner });

      await tokenInstance.approve(alreadyEndedCrowdsaleAddress, 100, { from: otherUser });

      try {
        await crowdsaleInstance.joinCrowdsale(alreadyEndedCrowdsaleAddress, { from: otherUser });
      } catch (error) {
        assert(error.message.includes("Crowdsale end must not be passed"), "join failed but not for expected reason");
        return;
      }
    });
  });


  describe("Legit crowdsale actions", async () => {
    let tokenToAcceptAddr;
    let tokenToGiveAddr;
    let crowdsaleAddress;
    let CrowdsaleFactoryInstance;
    let TokenFactoryInstance;

    before( async() => {
      //creating crowdsale 
      CrowdsaleFactoryInstance = await CrowdsaleFactory.new();
      TokenFactoryInstance = await TokenFactory.new();

      let transaction = await TokenFactoryInstance.createToken(
        tokenToAccept.name,
        tokenToAccept.symbol,
        tokenToAccept.decimals,
        tokenToAccept.logoURL,
        tokenToAccept.logoHash,
        tokenToAccept.supply,
        tokenToAccept.contractHash,
        { from: owner }
      );
      tokenToAcceptAddr = transaction.receipt.logs[0].args._contractAddress;

      transaction = await TokenFactoryInstance.createToken(
        tokenToGive.name,
        tokenToGive.symbol,
        tokenToGive.decimals,
        tokenToGive.logoURL,
        tokenToGive.logoHash,
        tokenToGive.supply,
        tokenToGive.contractHash,
        { from: owner }
      );
      tokenToGiveAddr = transaction.receipt.logs[0].args._contractAddress;
      
      const {acceptRatio, giveRatio, maxCap, metadata } = crowdsale;

      const start = Math.floor(new Date() / 1000 - 10000);
      //86400000ms === 1day
      const end = Math.floor(new Date() / 1000 + 86400000);  

      transaction = await CrowdsaleFactoryInstance.createCrowdsale(
        tokenToGiveAddr,
        tokenToAcceptAddr,
        start,
        end,
        acceptRatio,
        giveRatio,
        maxCap,
        metadata,
        { from: owner }
      );
      crowdsaleAddress = transaction.receipt.logs[0].args._contractAddress;

      const tokenToGiveInstance = await TokenTemplate.at(tokenToGiveAddr);
      await tokenToGiveInstance.transfer(crowdsaleAddress, 250, {
          from: owner
      });

      const crowdsaleInstance = await TokenCrowdsale.at(crowdsaleAddress);
      await crowdsaleInstance.unlockCrowdsale({ from: owner });

      //sending tokens to another user to allow him to join in future tests
      const tokenToAcceptInstance = await TokenTemplate.at(tokenToAcceptAddr);
      await tokenToAcceptInstance.transfer(
        otherUser,
        3000, 
        { from: owner }
      );
    });

    it("Legit Join crowdsale", async () => {
      
      const crowdsaleInstance = await TokenCrowdsale.at(crowdsaleAddress, {from: owner});
      const tokenInstance = await TokenTemplate.at(tokenToAcceptAddr, {from: owner });

      let myReservation = await crowdsaleInstance.getMyReservation({ from: otherUser });
      assert.equal(myReservation.toNumber(), 0, "Must have 0 reservation at the beginning");

      await tokenInstance.approve(crowdsaleAddress, 1, { from: otherUser });
      await crowdsaleInstance.joinCrowdsale(1, { from : otherUser });

      myReservation = await crowdsaleInstance.getMyReservation({ from: otherUser });
      assert.equal(myReservation.toNumber(), 1, "Must have 1 reservation");

      await tokenInstance.approve(crowdsaleAddress, 34, { from: otherUser });
      await crowdsaleInstance.joinCrowdsale(34, { from : otherUser });

      myReservation = await crowdsaleInstance.getMyReservation({ from: otherUser });
      assert.equal(myReservation.toNumber(), 35, "Must have 35 reservation");

      const reservationsData = await crowdsaleInstance.getReservationsData({from : owner});
      assert.equal(reservationsData[0][0].toString(), otherUser, "Joiner must be in reservations data");
      assert.equal(reservationsData[1][0].toNumber(), 35, "Owner must have 1 reservation");
    });

    it("Refund me", async () => {
      const crowdsaleInstance = await TokenCrowdsale.at(crowdsaleAddress, {from: owner});
      const tokenInstance = await TokenTemplate.at(tokenToAcceptAddr, {from: owner });


      const balanceBN = await tokenInstance.balanceOf(otherUser, { from: otherUser });
      const balanceBefore = balanceBN.toNumber();

      try{
        await crowdsaleInstance.refundMe(1, { from : otherUser });
      }catch(error){
        assert(false, error.message);
      }

      balBN = await tokenInstance.balanceOf(otherUser, { from: otherUser });
      const balanceAfter = balBN.toNumber();

      assert.equal(balanceAfter, balanceBefore + 1, "Must have refunded 1 coin");
    }); 


    it("Should not refund more than the reservation an user has in the crowdsale", async () => {
      const crowdsaleInstance = await TokenCrowdsale.at(crowdsaleAddress, {from: owner});

      const otherUserReservation = await crowdsaleInstance.getMyReservation({from: otherUser});
      
      try{
        await crowdsaleInstance.refundMe(otherUserReservation + 1, { from : otherUser });
      }catch(error){
        assert(error.message.includes("Must have some funds to refund"), "refund correctly failed but for the wrong reasons");
        return;
      }
      assert(false, "refundMe should fail when trying to refund > than reservation");
    });

    it("Join crowdsale (over maxCap) and obtain reservation", async () => {
      const crowdsaleInstance = await TokenCrowdsale.at(crowdsaleAddress, {from: owner});
      const tokenToAcceptInstance = await TokenTemplate.at(tokenToAcceptAddr, {from: owner });
      const tokenToGiveInstance = await TokenTemplate.at(tokenToGiveAddr, {from: owner});

      const extra = 10;
      await tokenToAcceptInstance.approve(crowdsaleAddress, 3 * crowdsale.maxCap, { from: otherUser });

      let balanceReceivedTokensBN = await tokenToGiveInstance.balanceOf(otherUser, { from: otherUser });
      const balanceReceivedTokens = balanceReceivedTokensBN.toNumber();
      assert.equal(balanceReceivedTokens, 0, "at this point otherUser should have a balance of 0 for the tokens he must receive from the crowdsale");

      await crowdsaleInstance.joinCrowdsale(2 * crowdsale.maxCap + extra, { from: otherUser });

      balanceReceivedTokensBN = await tokenToGiveInstance.balanceOf(otherUser, { from: otherUser });
      const balanceReceivedTokensAfter = balanceReceivedTokensBN.toNumber();
      assert.equal(balanceReceivedTokensAfter, balanceReceivedTokens + crowdsale.maxCap, "Expecting to have added difference to maxCap after cap reached");

      const myNewReservation = await crowdsaleInstance.getMyReservation({ from: otherUser });
      assert.equal(myNewReservation.toNumber(), 0, "Must have no reservation left after crowdsale distributed");
  });
  });

});

const assertFailError = error => {
  assert.fail(`
    Should always be able to call smart contracts, got instead this error:
    caused by: 
    ${error.stack}
    Reason: "${error.reason}"`);
};