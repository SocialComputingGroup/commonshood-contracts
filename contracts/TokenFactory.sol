pragma solidity ^0.5.0;

import "./TokenTemplate.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title TokenFactory is a contract following Factory
 *        Pattern to generate tokens.
 */
contract TokenFactory {
    using SafeMath for uint256;

    struct TokenData {
        address contractAddress;
        string name;
        string symbol;
        uint8 decimals;
        string logoURL;
        address owner;
        uint256 hardCap;
        bool mintable;
    }

    struct Registry {
        address[] tokenAddresses; //this will contain the addresses of the tokens possessed by an owner
        mapping(address => bool) alreadyIn; //this is just to help in fast checks (to avoid iterating over an array)
    }

    mapping(string => bool) internal usedSymbols;
    mapping(address => TokenData) internal tokensByAddress;
    mapping(string => TokenData) internal tokensBySymbol;
    mapping(address => bool) internal isAdmin;
    mapping(address => Registry) internal possessedTokens; //the key address is an owner
    address[] internal tokenCreatedAddresses;

    event TokenAdded(
        address indexed _from,
        uint256 _timestamp,
        address _contractAddress,
        string _name,
        string _symbol,
        uint8 _decimals,
        string _logoURL,
        uint256 _hardCap
    );
    event AdminAdded(address indexed _from, address indexed _who);

    event factoryDebug(address indexed _from, string _op, string _msg);

    constructor() public {
        isAdmin[msg.sender] = true;
        emit AdminAdded(address(0), msg.sender);
    }

    /**
     * @dev Callable only by an admin, makeAdmin adds another specified address as admin
     *      of the TokenFactory.
     * @param _address the address to make admin
     */
    function makeAdmin(address _address) public {
        require(isAdmin[msg.sender], "Must be admin to create another admin");
        isAdmin[_address] = true;
        emit AdminAdded(msg.sender, _address);
    }

    function getAllTokenAddresses() public view returns(address[] memory){
        return tokenCreatedAddresses;
    }

    /**
     * @dev getToken gets a created Token data by its symbol.
     * @param tokenAddress the address of the Token.
     * @return the Token data in array form.
     */
    function getToken(address tokenAddress) public view
        returns(address, string memory, string memory, uint8, string memory, address, bool) {
        return (
            tokensByAddress[tokenAddress].contractAddress,
            tokensByAddress[tokenAddress].name,
            tokensByAddress[tokenAddress].symbol,
            tokensByAddress[tokenAddress].decimals,
            tokensByAddress[tokenAddress].logoURL,
            tokensByAddress[tokenAddress].owner,
            tokensByAddress[tokenAddress].mintable
        );
    }
    /**
     * overload. As above but
     * @param symbol the symbol of the coin
     */
    function getToken(string memory symbol) public view
        returns(address, string memory, string memory, uint8, string memory, address, bool) {
        return (
            tokensBySymbol[symbol].contractAddress,
            tokensBySymbol[symbol].name,
            tokensBySymbol[symbol].symbol,
            tokensBySymbol[symbol].decimals,
            tokensBySymbol[symbol].logoURL,
            tokensBySymbol[symbol].owner,
            tokensBySymbol[symbol].mintable
        );
    }
    
    /**
     * @dev this function is called usually by a tokenTempalte to add the coin in the list of those possessed by the user
     *      after a transfer executed successfully
     *      We check the balance is > 0 to avoid that some malevolent person/contract tries to add garbage to an unrelated
     *      address.
     * @param _possessor the address of the wallet of which we have to update the possessedTokens array
     * @param _tokenAddress the address of the token to add
     */
    function addToPossessed(address _possessor, address _tokenAddress) public{
        require(TokenTemplate(_tokenAddress).balanceOf(_possessor) > 0,
            "_possessor must have some amount of this token to add it to his possessions");
        if(possessedTokens[_possessor].alreadyIn[_tokenAddress] == false){ //else is already correctly populated
            address[] storage newPossessed = possessedTokens[_possessor].tokenAddresses;
            newPossessed.push(_tokenAddress);
            possessedTokens[_possessor].tokenAddresses = newPossessed;
            possessedTokens[_possessor].alreadyIn[_tokenAddress] = true;
        }
    }

    /**
     * @dev as above but without the check on balance and private, this is to be used internally when creating a new token.
     */
    function addToPossessedOnCreation(address _possessor, address _tokenAddress) internal{
        if(possessedTokens[_possessor].alreadyIn[_tokenAddress] == false){ //else is already correctly populated
            address[] storage newPossessed = possessedTokens[_possessor].tokenAddresses;
            newPossessed.push(_tokenAddress);
            possessedTokens[_possessor].tokenAddresses = newPossessed;
            possessedTokens[_possessor].alreadyIn[_tokenAddress] = true;
        }
    }

    /**
     * @param _possessor the address of which we want to know which tokens it posses
     * @return the array containing the adresses of tokens possesed by the user
     */
    function getPossessedTokens(address _possessor) public view returns(address[] memory){
        return possessedTokens[_possessor].tokenAddresses;
    }

    /**
     * @dev createToken creates a new TokenTemplate instance.
     * @param _name the name of the Token
     * @param _symbol the symbol of the Token.
     * @param _decimals the decimals of the Token. Must be between 0 and 18 included.
     * @param _logoURL the URL of the image representing the logo of the Token.
     * @param _logoHash the Hash of the image pointed by _logoURL, to ensure it has not been altered.
     * @param _hardCap the total supply of the Token.
     * @param _contractHash the Hash of the PDF contract bound to this Token.
     */
    function createToken(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        string memory _logoURL,
        bytes32 _logoHash,
        uint256 _hardCap,
        bytes32 _contractHash
    ) public {
        // symbol must not be already be created for this token, since it's unique,
        // so we check for 0 value struct (with 0 value contract address).
        require(
            usedSymbols[_symbol] == false,
            "symbol must not be already be created for this token, since it's unique"
        );

        // Generates the new contract and stores its address.
        // if hardCap = 0 token is mintable, otherwise it is capped to hardCap and all money is transfered to the creator
        // of the token.
        TokenTemplate tokenContract = new TokenTemplate(_name, _symbol, _decimals, _logoURL, _logoHash, _hardCap, msg.sender, _contractHash, address(this));

        TokenData memory tempTokenData = TokenData({
            contractAddress: address(tokenContract),
            name: _name,
            symbol: _symbol,
            decimals: _decimals,
            logoURL:_logoURL,
            owner: msg.sender,
            hardCap: _hardCap,
            mintable: false
        });

        if (_hardCap == 0) {
            // set mintable to true
            tempTokenData.mintable = true;
            // mint permission for all admins tokenContract.addMinter(admin)
        }

        tokensByAddress[address(tokenContract)] = tempTokenData;
        tokensBySymbol[_symbol] = tempTokenData;
        usedSymbols[_symbol] = true;

        tokenCreatedAddresses.push(address(tokenContract));
        addToPossessedOnCreation(msg.sender, address(tokenContract));

        //fullData.push(tempTokenData);

        emit TokenAdded(
            msg.sender,
            now,
            address(tokenContract),
            _name,
            _symbol,
            _decimals,
            _logoURL,
            _hardCap
        );
    }
}
