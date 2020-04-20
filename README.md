# Smart Contracts repository
This repository contains all smart contracts for the Commonshood DAPP project

### Pattern used
The main pattern here is the contract factory pattern and it works as follows:

There is a **Product** and a **Factory** contract, based on the *Factory Pattern* model.

The Factory creates product (in the case of the [Token Factory](./contracts/TokenFactory.sol) the Factory creates a series of tokens based on similar behaviors, which are the same of a standard ERC20 model token).

The created products references are maintained inside the factory and there is an **ACL** to control who can create products.


## Tokens
The [Token Template](./contracts/TokenTemplate.sol) contract reprents both Standard and Mintable token.
This is modeled by the constructor, if `totalSupply` is 0 the token is Mintable otherwise the supply is fixed.

## Crowdsales
The [Token Crowdsale](./contracts/TokenCrowdsale.sol) TokenCrowdsale contract allows multiple entities to put money into, and when a certain cap is reached. It accepts a token and returns another token based on an *accept ratio* and a *give ratio*.

## DAOs
The [CcDAO](./contracts/CcDAO.sol) contract consists in an organization that have an owner and various members with various roles. The organization is capable of issuing tokens (ERC20 compliant) or Crowdsales. Tokens can be transfered to others accounts or others DAOs. Only members with a role grater than or equal to *ROLE_ADMIN* can issue new tokens and crowdsales.
Users can join the DAO with the role *ROLE_MEMBER*. They can be promoted to higher roles only by a *ROLE_ADMIN* or a *ROLE_OWNER*. All writing operations can be performed only by users with *ROLE_ADMIN* or higher.

## Token Factory
The [Token Factory](./contracts/TokenFactory.sol) contract allows to issue an ERC20 compliant token. The token can be Standard or Mintable.

## Crowdsale Factory
The [Crowdsale Factory](./contracts/CrowdsaleFactory.sol) contract allows users to create a new Crowdsale that accepts an ERC20 compliant token and returns, when the requirements are met, another token. There is an acceptRatio that defines the minimum unit of token accepted, and each increment should be a multiple of that ratio; there is also a giveRatio that is the unit of token that will be distributed for each increment of acceptRatio.

## DAO Factory
The [DAO Factory](./contracts/DAOFactory.sol) allows users to create a new DAO. The function that creates a new DAO requires a TokenFactory and a CrowdsaleFactory address in order to allow the DAO to issue new tokens or create new crowdsales.

### Additional notes
This repository follows the truffle model, and it has been created to be used with truffle and ganache on local development, while testnet configuration skeletons can be provided later but require a wallet to be setup and a passphrase to be set and shared among developers.