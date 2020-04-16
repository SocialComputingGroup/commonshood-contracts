pragma solidity ^0.5.0;

import "./CcDAO.sol";

/**
 * @title DAOFactory is a contract following Factory
 *        Pattern to generate CcDAOs.
 */
contract DAOFactory {
    mapping(string => CcDAO) internal daos;
    mapping(address => bool) internal isAdmin;

    event DAOAdded(
        address indexed _from,
        uint256 _timestamp,
        address _contractAddress,
        string _name,
        string _firstlifePlaceID
    );

    event AdminAdded(address indexed _from, address indexed _who);

    constructor() public {
        isAdmin[msg.sender] = true;
        emit AdminAdded(address(0), msg.sender);
    }

    /**
     * @dev Callable only by an admin, makeAdmin adds another specified address as admin
     *      of the DAOFactory.
     * @param _address the address to make admin
     */
    function makeAdmin(address _address) public {
        require(isAdmin[msg.sender], "Only admins can add admins");
        isAdmin[_address] = true;
        emit AdminAdded(msg.sender, _address);
    }

    /**
     * @dev createDAO creates a new DAO.
     * @param _name the name of the DAO.
     * @param _firstlifePlaceID the placeID on Firstlife database.
     * @param _tokenFactory the deployed TokenFactory instance.
     * @param _crowdsaleFactory the deployed CrowdsaleFactory intance.
     */
    function createDAO(
        string memory _name,
        string memory _firstlifePlaceID,
        TokenFactory _tokenFactory,
        CrowdsaleFactory _crowdsaleFactory
    ) public {
        require(address(daos[_firstlifePlaceID]) == address(0), "Must not have a running DAO");
        daos[_firstlifePlaceID] = new CcDAO(_tokenFactory, _crowdsaleFactory, _name, _firstlifePlaceID, msg.sender);
        emit DAOAdded(
            msg.sender,
            now,
            address(daos[_firstlifePlaceID]),
            _name,
            _firstlifePlaceID
        );
    }

    /**
     * @dev getDAO returns a DAO address by firstlife place ID.
     * @param _firstlifePlaceID the placeID on Firstlife database.
     * @return the address of the DAO.
     */
    function getDAO(string memory _firstlifePlaceID) public view returns(address) {
        return address(daos[_firstlifePlaceID]);
    }

    /**
     * @dev createToken creates a new TokenTemplate instance.
     * @param _firstlifePlaceID the placeID on Firstlife database.
     * @param _name the name of the Token
     * @param _symbol the symbol of the Token.
     * @param _logoURL the URL of the image representing the logo of the Token.
     * @param _logoHash the Hash of the image pointed by _logoURL, to ensure it has not been altered.
     * @param _hardCap the total supply of the Token.
     * @param _contractHash the Hash of the PDF contract bound to this Token.
     */
    function createToken(
        string memory _firstlifePlaceID,
        string memory _name,
        string memory _symbol,
        string memory _logoURL,
        bytes32 _logoHash,
        uint256 _hardCap,
        bytes32 _contractHash
    ) public {
        daos[_firstlifePlaceID].createToken(_name, _symbol, _logoURL, _logoHash, _hardCap, _contractHash);
    }

    /**
     * @dev createCrowdsale creates a new crowdsale.
     * @param _crowdsaleID the crowdsale ID, must be unique.
     * @param _firstlifePlaceID the placeID on Firstlife database.
     * @param _tokenToGive the TokenTemplate instance used to give new tokens.
     * @param _tokenToAccept the TokenTemplate instance used to accept contributions.
     * @param _start the start time of the crowdsale.
     * @param _end the end time of the crowdsale.
     * @param _acceptRatio how many tokens to accept in ratio to _giveRatio.
     * @param _giveRatio how many tokens to give in ration to _acceptRatio.
     * @param _maxCap the threshold the TokenToGive tokens are released.
     * @return the address of the created crowdsale.
     */
    function createCrowdsale(
        string memory _crowdsaleID,
        string memory _firstlifePlaceID,
        string memory _tokenToGive,
        string memory _tokenToAccept,
        uint _start,
        uint _end,
        uint8 _acceptRatio,
        uint8 _giveRatio,
        uint _maxCap
    ) public {
        daos[_firstlifePlaceID].createCrowdsale(_crowdsaleID, _tokenToGive, _tokenToAccept, _start, _end, _acceptRatio, _giveRatio, _maxCap);
    }

    /**
     * @dev unlockCrowdsale unlocks the crowdsale if requirements are met.
     * @param _crowdsaleID the id of the crowdsale.
     * @param _firstlifePlaceID the placeID on Firstlife database.
     */
    function unlockCrowdsale(
        string memory _crowdsaleID,
        string memory _firstlifePlaceID
    ) public {
        daos[_firstlifePlaceID].unlockCrowdsale(_crowdsaleID);
    }

    /**
     * @dev stopCrowdsale sets the crowdsale as Stopped.
     * @param _crowdsaleID the id of the crowdsale.
     * @param _firstlifePlaceID the placeID on Firstlife database.
     */
    function stopCrowdsale(
        string memory _crowdsaleID,
        string memory _firstlifePlaceID
    ) public {
        daos[_firstlifePlaceID].stopCrowdsale(_crowdsaleID);
    }
}
