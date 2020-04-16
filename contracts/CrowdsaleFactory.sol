pragma solidity ^0.5.0;

import "./TokenCrowdsale.sol";
import "./TokenTemplate.sol";
import "./TokenCrowdsale.sol";

/**
 * @title CrowdsaleFactory is a contract following Factory
 *        Pattern to generate crowdsales.
 */
contract CrowdsaleFactory {
    struct CrowdsaleData {
        address crowdsaleContract;
        TokenTemplate tokenToGive;
        TokenTemplate tokenToAccept;
        uint256 start;
        uint256 end;
        uint8 acceptRatio;
        uint8 giveRatio;
        uint256 maxCap;
        address owner;
    }

    mapping(string => CrowdsaleData) internal crowdsales;
    mapping(address => bool) internal isAdmin;

    event CrowdsaleAdded(
        string indexed _id,
        address indexed _from,
        uint256 _timestamp,
        address _contractAddress,
        uint256 _start,
        uint256 _end,
        uint8 _acceptRatio,
        uint8 _giveRatio,
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
     * @dev getCrowdsale gets the crowdsale from its ID.
     * @param id the crowdsale ID.
     * @return the full data of the crowdsale.
     */
    function getCrowdSale(
        string memory id
    ) public view returns(
        address,
        TokenTemplate,
        TokenTemplate,
        uint256,
        uint256,
        uint8,
        uint8,
        uint256,
        address
    ){
        CrowdsaleData storage crowdsale = crowdsales[id];
        return (
            crowdsale.crowdsaleContract,
            crowdsale.tokenToGive,
            crowdsale.tokenToAccept,
            crowdsale.start,
            crowdsale.end,
            crowdsale.acceptRatio,
            crowdsale.giveRatio,
            crowdsale.maxCap,
            crowdsale.owner
        );
    }

    /**
     * @dev createCrowdsale creates a new crowdsale.
     * @param _crowdsaleID the crowdsale ID, must be unique.
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
        address _tokenToGive,
        address _tokenToAccept,
        uint256 _start,
        uint256 _end,
        uint8 _acceptRatio,
        uint8 _giveRatio,
        uint256 _maxCap
        ) public returns(address) {
        address crowdsaleAddr = address(new TokenCrowdsale(
            TokenTemplate(_tokenToGive),
            TokenTemplate(_tokenToAccept),
            _start,
            _end,
            _acceptRatio,
            _giveRatio,
            _maxCap,
            msg.sender
        ));

        CrowdsaleData memory tempData = CrowdsaleData({
            crowdsaleContract: crowdsaleAddr,
            tokenToGive: TokenTemplate(_tokenToGive),
            tokenToAccept: TokenTemplate(_tokenToAccept),
            start: _start,
            end: _end,
            acceptRatio: _acceptRatio,
            giveRatio: _giveRatio,
            maxCap: _maxCap,
            owner: msg.sender
        });

        crowdsales[_crowdsaleID] = tempData;

        emit CrowdsaleAdded(
            _crowdsaleID,
            msg.sender,
            now,
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
     * @param _id the id of the crowdsale.
     */
    function unlockCrowdsale(
        string memory _id
    ) public {
        (TokenCrowdsale)(crowdsales[_id].crowdsaleContract).unlockCrowdsale();
    }

    /**
     * @dev stopCrowdsale sets the crowdsale as Stopped.
     * @param _id the id of the crowdsale.
     */
    function stopCrowdsale(
        string memory _id
    ) public {
        (TokenCrowdsale)(crowdsales[_id].crowdsaleContract).stopCrowdsale();
    }

    /**
     * @dev joinCrowdsale allows the user to contribute by the specified amount of TokenToGive,
     *      if it passes the checks.
     * @param _id the id of the crowdsale.
     * @param _amount the amount of TokenToAccept to join the crowdsale with.
     */
    function joinCrowdsale(
        string memory _id,
        uint256 _amount
    ) public {
        (TokenCrowdsale)(crowdsales[_id].crowdsaleContract).joinCrowdsale(_amount);
    }
}