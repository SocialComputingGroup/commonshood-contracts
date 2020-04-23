pragma solidity ^0.5.0;

import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./TokenFactory.sol";

/**
 * @title TokenTemplate
 * @dev Very simple ERC20 Token that can be minted.
 * It is meant to be used in all crowdsale contracts.
 */
contract TokenTemplate is ERC20Detailed, ERC20Mintable {
    event Debug(string _message);

    address private _owner;
    string private _logoURL;
    string private _logoHash;
    string private _contractHash;
    TokenFactory private _tokenFactory;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        string memory logoURL,
        string memory logoHash,
        uint256 totalSupply,
        address owner,
        string memory contractHash,
        address tokenFactoryAddress
    ) ERC20Detailed(name, symbol, decimals) ERC20Mintable() public {
        require(owner != address(0), "Owner must be defined");
        _logoURL = logoURL;
        _addMinter(owner);
        if (totalSupply > 0) {
            _mint(owner, totalSupply);
            _removeMinter(owner);
        }

        _owner = owner;
        _contractHash = contractHash;
        _logoHash = logoHash;
        _tokenFactory = TokenFactory(tokenFactoryAddress);
    }

    /**
     * override of erc20 transfer
     */
    function transfer(address recipient, uint256 amount) public returns (bool) {
        _transfer(_msgSender(), recipient, amount); //call to erc20 standard transfer
        _tokenFactory.addToPossessed(recipient, address(this));
        return true;
    }

    /**
     * @return The Logo of the URL of the Token.
     */
    function logoURL() public view returns(string memory) {
        return _logoURL;
    }

    /**
     * @return The hash of the logo of the token.
     */
    function logoHash() public view returns(string memory) {
        return _logoHash;
    }

    /**
     * @return The hash of the PDF contract of the Token.
     */
    function contractHash() public view returns(string memory) {
        return _contractHash;
    }

    /**
     * @return The address of the owner of the coin
     */
     function owner() public view returns(address){
        return _owner;
     }

}