pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./TokenCrowdsale.sol";
import "./TokenTemplate.sol";

/**
 * @dev CrowdsaleFactory is a contract following Factory Pattern to generate crowdsales.
 *
 * This contract allows users to create a new Crowdsale that accepts an ERC20 compliant token
 * and returns, when the requirements are met, another token. There is an acceptRatio that
 * defines the minimum unit of token accepted, and each increment should be a multiple of
 * that ratio; there is also a giveRatio that is the unit of token that will be distributed
 * for each increment of acceptRatio.
 */
contract CrowdsaleFactory {
    address[] internal crowdsalesAddresses;
    mapping(address => address[]) crowdsalesByOwner; //here the key is the owner of the crowdsales
    mapping(address => bool) internal isAdmin;

    event CrowdsaleAdded(
        address indexed _from,
        uint256 _timestamp,
        address _contractAddress,
        uint256 _start,
        uint256 _end,
        uint256 _acceptRatio,
        uint256 _giveRatio,
        uint256 _maxCap,
        address owner
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
        require(isAdmin[msg.sender], "Only an admin can make other admins");
        isAdmin[_address] = true;
        emit AdminAdded(msg.sender, _address);
    }


    /**
     * @return an array of addresses containing the addresses of all crowdsales created
     *          by this factory
     */
    function getAllCrowdsalesAddresses() public view returns(address[] memory){
        return crowdsalesAddresses;
    }

    /**
     * @param _owner the owner of some crowdsale created via this CrowdsaleFactory
     * @return an array of addresses of TokenCrowdsales owned by _owner
     */
    function getCrowdsalesByOwner(address _owner) public view returns(address[] memory){
        return crowdsalesByOwner[_owner];
    }

    /**
     * @dev createCrowdsale creates a new crowdsale.
     * @param _tokenToGive the TokenTemplate instance used to give new tokens.
     * @param _tokenToAccept the TokenTemplate instance used to accept contributions.
     * @param _start the start time of the crowdsale.
     * @param _end the end time of the crowdsale.
     * @param _acceptRatio how many tokens to accept in ratio to _giveRatio.
     * @param _giveRatio how many tokens to give in ration to _acceptRatio.
     * @param _maxCap the threshold the TokenToGive tokens are released.
     * @param metadata a string array containing in order: title, description, logoHash and TOSHash
     * @return the address of the created crowdsale.
     */
    function createCrowdsale(
        address _tokenToGive,
        address _tokenToAccept,
        uint256 _start,
        uint256 _end,
        uint256 _acceptRatio,
        uint256 _giveRatio,
        uint256 _maxCap,
        string[] memory metadata
        ) public returns(address) {
        require(metadata.length == 4, "Metadata must be fully populated");
        address crowdsaleAddr = address(new TokenCrowdsale(
            TokenTemplate(_tokenToGive),
            TokenTemplate(_tokenToAccept),
            _start,
            _end,
            _acceptRatio,
            _giveRatio,
            _maxCap,
            msg.sender,
            metadata
        ));

        crowdsalesAddresses.push(crowdsaleAddr);
        //updating list of crowdsales owned by msg.sender:
        address[] storage ownedCrowdsales = crowdsalesByOwner[msg.sender];
        ownedCrowdsales.push(crowdsaleAddr);
        crowdsalesByOwner[msg.sender] = ownedCrowdsales;


        emit CrowdsaleAdded(
            msg.sender,
            now, // no security concern for us (see documentation on why you shouldn't use it if you need time to be precise within 90 seconds)
            crowdsaleAddr,
            _start,
            _end,
            _acceptRatio,
            _giveRatio,
            _maxCap,
            msg.sender
        );

        return crowdsaleAddr;
    }

    /**
     * @dev unlockCrowdsale unlocks the crowdsale if requirements are met.
     * @param crowdsalesAddress the address of the crowdsale.
     */
    function unlockCrowdsale(
        address crowdsalesAddress
    ) public {
        require(address(TokenCrowdsale(crowdsalesAddress).owner) == msg.sender,
        "Only Crowdsale creator can unlock crowdsales from the factory");
        TokenCrowdsale(crowdsalesAddress).unlockCrowdsale();
    }

    /**
     * @dev stopCrowdsale sets the crowdsale as Stopped.
     * @param crowdsalesAddress the address of the crowdsale.
     */
    function stopCrowdsale(
        address crowdsalesAddress
    ) public {
        require(address(TokenCrowdsale(crowdsalesAddress).owner) == msg.sender,
        "Only Crowdsale creator can stop crowdsales from the factory");
        TokenCrowdsale(crowdsalesAddress).stopCrowdsale();
    }

    /**
     * @dev joinCrowdsale allows the user to contribute by the specified amount of TokenToGive,
     *      if it passes the checks.
     * @param crowdsalesAddress the address of the crowdsale.
     * @param _amount the amount of TokenToAccept to join the crowdsale with.
     */
    function joinCrowdsale(
        address crowdsalesAddress,
        uint256 _amount
    ) public {
        TokenCrowdsale(crowdsalesAddress).joinCrowdsale(_amount);
    }
}