const TokenFactory = artifacts.require("./TokenFactory.sol");
const TokenTemplate = artifacts.require("./TokenTemplate.sol");
const util = require('util') // this is imported to allow use of util.inspect when you want to console.log a circular js object

contract("TokenFactory", async accounts => {
  const mintableToken = {
      name: "Mintable Token",
      symbol: "MNT",
      decimals: 18,
      logoURL:
        "https://apollo-uploads-las.s3.amazonaws.com/1442324623/atlanta-hawks-logo-944556.png",
      logoHash:"logoHash",
      contractHash: "contractHash",
      supply: 0
    },
    mintableToken2 = {
      name: "Second Mintable Token",
      symbol: "SCMNT",
      decimals: 2,
      logoURL:
        "https://apollo-uploads-las.s3.amazonaws.com/1442324623/atlanta-hawks-logo-944556.png",
      logoHash: "logoHash",
      contractHash: "contractHash",
      supply: 5000
    },
    cappedToken = {
      name: "Capped Token",
      symbol: "CAP",
      decimals: 18,
      logoURL:
        "https://apollo-uploads-las.s3.amazonaws.com/1442324623/atlanta-hawks-logo-944556.png",
      logoHash: "logoHash",
      contractHash: "contractHash",
      supply: 100
    },
    cappedToken2 ={
      name: "Capped Token",
      symbol: "CCCAP",
      decimals: 2,
      logoURL:
        "https://apollo-uploads-las.s3.amazonaws.com/1442324623/atlanta-hawks-logo-944556.png",
      logoHash: "logoHash",
      contractHash: "contractHash",
      supply: 1800
    };

  const owner = accounts[0];
  const otherUser = accounts[1];

  before(async function() {
    try {
      await web3.eth.personal.unlockAccount(owner, "", 10000);
      await web3.eth.personal.unlockAccount(otherUser, "", 10000);
    } catch(error) {
      console.warn(`error in unlocking wallet: ${JSON.stringify(error)}`);
    }
  });

  describe("Token Creation Test", _ => {
    it("Legit Create a Mintable Token", async () => {
      const TokenFactoryInstance = await TokenFactory.new();
      const {
        symbol,
        name,
        decimals,
        logoURL,
        supply,
        logoHash,
        contractHash
      } = mintableToken;

      const transaction = await TokenFactoryInstance.createToken(
        name,
        symbol,
        decimals,
        logoURL,
        logoHash,
        supply,
        contractHash,
        { from: owner }
      );
      const tokenAddress = transaction.receipt.logs[0].args._contractAddress;
      
      const token = await TokenFactoryInstance.methods['getToken(address)'](tokenAddress, {from: owner}); //NOTE this is the correct way to call overloaded methods in truffle!
      assert.equal(token[5], owner, "Must have owner who sent the transaction");

      const sameToken = await TokenFactoryInstance.methods['getToken(string)'](symbol, {from: owner});
      assert.equal(sameToken[2], symbol, "Symbol must be the same");
      
      assert.equal(JSON.stringify(sameToken), JSON.stringify(token), "Each field must be equal" );
      

      const arrayOfTokenAddresses = await TokenFactoryInstance.getAllTokenAddresses();
      assert(arrayOfTokenAddresses.length !== 0, "The array containing the addresses should not be empty");
      assert.equal(arrayOfTokenAddresses[0], tokenAddress, "The address of the created token should be in the array containing every one");
    });

    it("Legit Create Capped Token", async () => {
      const TokenFactoryInstance = await TokenFactory.new();
      const {
        symbol,
        name,
        decimals,
        logoURL,
        supply,
        logoHash,
        contractHash
      } = cappedToken;

      const transaction = await TokenFactoryInstance.createToken(
        name,
        symbol,
        decimals,
        logoURL,
        logoHash,
        supply,
        contractHash,
        { from: owner }
      );
      const tokenAddress = transaction.receipt.logs[0].args._contractAddress; 

      const token = await TokenFactoryInstance.methods['getToken(address)'](tokenAddress, {from: owner});
      assert.equal(token[5], owner, "Must have owner who sent the transaction");

      const sameToken = await TokenFactoryInstance.methods['getToken(string)'](symbol, {from: owner});
      assert.equal(sameToken[2], symbol, "Symbol must be the same");
      
      assert.equal(JSON.stringify(sameToken), JSON.stringify(token), "Each field must be equal" );

      const arrayOfTokenAddresses = await TokenFactoryInstance.getAllTokenAddresses();
      assert(arrayOfTokenAddresses.length !== 0, "The array containing the addresses should not be empty");
      assert.equal(arrayOfTokenAddresses[0], tokenAddress, "The address of the created token should be in the array containing every one");
    });


    it("Correctly creates more than one token in a row", async () =>{
      const TokenFactoryInstance = await TokenFactory.new();

      const transactionPromises = [mintableToken, mintableToken2, cappedToken].map( token => {
        const {symbol, name, decimals, logoURL, supply, logoHash, contractHash} = token;
        return TokenFactoryInstance.createToken(
          name, symbol, decimals, logoURL, logoHash, supply, contractHash, { from: owner }
        );
      });

      const transactions = await Promise.all(transactionPromises);
      const tokenAddresses = transactions.map((transaction) => {
        return transaction.receipt.logs[0].args._contractAddress;
      });

      const tokenInstancesPromises = tokenAddresses.map( (tokenAddress) => {
        return TokenTemplate.at(tokenAddress);
      });
      const tokenInstances = await Promise.all(tokenInstancesPromises);
      
      const arrayOfTokenAddresses = await TokenFactoryInstance.getAllTokenAddresses();
      assert(arrayOfTokenAddresses.length === tokenInstances.length, `There should be ${tokenInstances.length} tokens registered in the factory. Found ${arrayOfTokenAddresses.length}`);
      tokenInstances.forEach( (token, index) =>{
        assert.equal(token._contractAddress, arrayOfTokenAddresses[index]._contractAddress, `Contract addresses should be correctly registered`);
      });
    });
  });


  

  describe("Transfer test", _ => {
    it("Legit transfer token (capped)", async () => {
      const TokenFactoryInstance = await TokenFactory.new();
      const {symbol, name, decimals, logoURL, supply, logoHash, contractHash} = cappedToken;

      await TokenFactoryInstance.createToken(
        name, symbol, decimals, logoURL, logoHash, supply, contractHash, { from: owner }
      );

      const tokenData = await TokenFactoryInstance.methods['getToken(string)'](
        cappedToken.symbol,
        { from: owner }
      );
      const tokenInstance = await TokenTemplate.at(tokenData[0]); //in 0 there is the contract address of the token

      let ownerBalance = await tokenInstance.balanceOf(owner, { from: owner });
      let otherUserBalance = await tokenInstance.balanceOf(otherUser, {
        from: otherUser
      });

      assert.equal(
        ownerBalance,
        cappedToken.supply,
        "[PRE TRANSFER] Owner should have token equal to total supply before the transfer"
      );
      assert.equal(
        otherUserBalance,
        0,
        "[PRE TRANSFER] Other member should have token equal to 0 before the transfer"
      );

      let ownerArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(owner);
      assert.equal(ownerArrayOfPossessedTokens.length, 1, "[PRE TRANSFER] the owner must posses one token");
      assert.equal(ownerArrayOfPossessedTokens[0], tokenData[0], `[PRE TRANSFER] the only posses token must be ${symbol} with address ${tokenData[0]}`);

      let otherUserArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(otherUser);
      assert.equal(otherUserArrayOfPossessedTokens.length, 0, "[PRE TRANSFER] the other user must posses still zero tokens");

      await tokenInstance.transfer(otherUser, cappedToken.supply / 2, {from: owner});

      ownerBalance = await tokenInstance.balanceOf(owner, { from: owner });
      otherUserBalance = await tokenInstance.balanceOf(otherUser, {
        from: otherUser
      });
      assert.equal(
        ownerBalance,
        cappedToken.supply / 2,
        "[POST TRANSFER]Owner should have token equal to half total supply before the transfer"
      );
      assert.equal(
        otherUserBalance,
        cappedToken.supply / 2,
        "[POST TRANSFER]Other member should have token equal to half total supply before the transfer"
      );

      otherUserArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(otherUser);
      assert.equal(otherUserArrayOfPossessedTokens.length, 1, "[POST TRANSFER]the other user must posses one token");
      assert.equal(otherUserArrayOfPossessedTokens[0], tokenData[0], `the other user must posses ${tokenData[0]}`);
      
      await tokenInstance.transfer(otherUser, cappedToken.supply / 2, {from: owner});
      otherUserArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(otherUser);
      assert.equal(otherUserArrayOfPossessedTokens.length, 1, "[POST SECOND TRANSFER]the other user must posses still one token, no repetition inside");
      assert.equal(otherUserArrayOfPossessedTokens[0], tokenData[0], `the other user must posses ${tokenData[0]}`);

    });



    it("Legit transfer token (mintable)", async () => {
      const TokenFactoryInstance = await TokenFactory.new();

      const {symbol, name, decimals, logoURL, supply, logoHash, contractHash} = mintableToken;
      await TokenFactoryInstance.createToken(
        name, symbol, decimals, logoURL, logoHash, supply, contractHash, { from: owner }
      );

      const tokenData = await TokenFactoryInstance.methods['getToken(string)'](
        mintableToken.symbol,
        { from: owner }
      );
      const tokenInstance = await TokenTemplate.at(tokenData[0]);

      await tokenInstance.mint(owner, cappedToken.supply, { from: owner });

      let ownerBalance = await tokenInstance.balanceOf(owner, { from: owner });
      let otherUserBalance = await tokenInstance.balanceOf(otherUser, { from: otherUser});

      assert.equal(
        ownerBalance,
        cappedToken.supply,
        "[PRE TRANSFER]Owner should have token equal to total supply before the transfer"
      );
      assert.equal(
        otherUserBalance,
        0,
        "[PRE TRANSFER]Other member should have token equal to 0 before the transfer"
      );

      let ownerArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(owner);
      assert.equal(ownerArrayOfPossessedTokens.length, 1, "[PRE TRANSFER] the owner must posses one token");
      assert.equal(ownerArrayOfPossessedTokens[0], tokenData[0], `[PRE TRANSFER] the only posses token must be ${symbol} with address ${tokenData[0]}`);

      let otherUserArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(otherUser);
      assert.equal(otherUserArrayOfPossessedTokens.length, 0, "[PRE TRANSFER] the other user must posses still zero tokens");

      await tokenInstance.transfer(otherUser, cappedToken.supply / 2, {
        from: owner
      });

      ownerBalance = await tokenInstance.balanceOf(owner, { from: owner });
      otherUserBalance = await tokenInstance.balanceOf(otherUser, {
        from: otherUser
      });

      assert.equal(
        ownerBalance,
        cappedToken.supply / 2,
        "[POST TRANSFER]Owner should have token equal to half total supply after the transfer"
      );
      assert.equal(
        otherUserBalance,
        cappedToken.supply / 2,
        "[POST TRANSFER]Other member should have token equal to half total supply after the transfer"
      );

      otherUserArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(otherUser);
      assert.equal(otherUserArrayOfPossessedTokens.length, 1, "[POST TRANSFER]the other user must posses one token");
      assert.equal(otherUserArrayOfPossessedTokens[0], tokenData[0], `the other user must posses ${tokenData[0]}`);
      
      await tokenInstance.transfer(otherUser, cappedToken.supply / 2, {from: owner});
      otherUserArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(otherUser);
      assert.equal(otherUserArrayOfPossessedTokens.length, 1, "[POST SECOND TRANSFER]the other user must posses still one token, no repetition inside");
      assert.equal(otherUserArrayOfPossessedTokens[0], tokenData[0], `the other user must posses ${tokenData[0]}`);
    });



    it("Should not transfer when amount is too big compared to supply", async () => {
      const TokenFactoryInstance = await TokenFactory.new();

      const {symbol, name, decimals, logoURL, supply, logoHash, contractHash} = mintableToken;
      await TokenFactoryInstance.createToken(
        name, symbol, decimals, logoURL, logoHash, supply, contractHash, { from: owner }
      );

      const tokenData = await TokenFactoryInstance.methods['getToken(string)'](
        mintableToken.symbol,
        { from: owner }
      );
      const tokenInstance = await TokenTemplate.at(tokenData[0]);
      let ownerBalance = await tokenInstance.balanceOf(owner, { from: owner });
      let otherUserBalance = await tokenInstance.balanceOf(otherUser, { from: otherUser});

      assert.equal(
        ownerBalance,
        0,
        "[PRE TRANSFER]Owner should have token equal to total supply before the transfer"
      );
      assert.equal(
        otherUserBalance,
        0,
        "[PRE TRANSFER]Other member should have token equal to 0 before the transfer"
      );

      try{
        await tokenInstance.transfer(otherUser, 10, {
          from: owner
        });
      }catch(error){
        assert(error.message.includes("transfer amount exceeds balance"), "something else unexpected happened");
        return;
      }
      assert(false, "Transfer should not be successfull")
    });
  });

  describe("Token possession tracking works as expected", _ => {
    it("Correctly populates possessedTokens arrays after creation and various transfers", async () => {
      const TokenFactoryInstance = await TokenFactory.new();
      const allTokens = [mintableToken2, cappedToken, cappedToken2];

      let ownerArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(owner);
      assert.equal(ownerArrayOfPossessedTokens.length, 0, "[PRE CREATION] the owner must posses zero token");
      let otherUserArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(otherUser);
      assert.equal(otherUserArrayOfPossessedTokens.length, 0, "[PRE CREATION] the other user must posses zero tokens");

      const transactionPromises = allTokens.map( token => {
        const {symbol, name, decimals, logoURL, supply, logoHash, contractHash} = token;
        return TokenFactoryInstance.createToken(
          name, symbol, decimals, logoURL, logoHash, supply, contractHash, { from: owner }
        );
      });
      const transactions = await Promise.all(transactionPromises);
      const tokenAddresses = transactions.map((transaction) => {
        return transaction.receipt.logs[0].args._contractAddress;
      });

      ownerArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(owner);
      assert.equal(ownerArrayOfPossessedTokens.length, allTokens.length, `[POST CREATION] the owner must posses ${allTokens.length} token`);
      assert.deepEqual(ownerArrayOfPossessedTokens, tokenAddresses, "[POST CREATION] the owner possessedTokens array must be consistent");
      otherUserArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(otherUser);
      assert.equal(otherUserArrayOfPossessedTokens.length, 0, "[POST CREATION] the other user must posses zero tokens");

      const tokenInstances = await Promise.all(tokenAddresses.map( async(address) => {
        return await TokenTemplate.at(address);
      }));

      await Promise.all(tokenInstances.map( (tokenInstance, index) => {
        return tokenInstance.transfer(otherUser, Math.round( allTokens[index].supply /3 ), {
          from: owner
        });
      }));

      otherUserArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(otherUser);
      assert.equal(otherUserArrayOfPossessedTokens.length, 3, "[POST TRANSFERS] the other user must posses 3 tokens");
      assert.deepEqual(otherUserArrayOfPossessedTokens, tokenAddresses, "[POST TRANSFERS] the OTHER USER possessedTokens array must be consistent");

      await tokenInstances[1].transfer(otherUser, Math.round( allTokens[1].supply /3), {
        from: owner
      });
      otherUserArrayOfPossessedTokens = await TokenFactoryInstance.getPossessedTokens(otherUser);
      assert.equal(otherUserArrayOfPossessedTokens.length, 3, "[POST LAST TRANSFER] the other user must posses 3 tokens, no duplicates");
      assert.deepEqual(otherUserArrayOfPossessedTokens, tokenAddresses, "[POST LAST TRANSFER] the OTHER USER possessedTokens array must be consistentm no duplicates");
    });
  });

});
