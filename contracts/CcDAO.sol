pragma solidity ^0.5.0;

import "./TokenFactory.sol";
import "./TokenTemplate.sol";
import "./CrowdsaleFactory.sol";

/**
 * @dev Implementation of a DAO (Decentralized Autonomous Organization) for the CommonsHood app.
 *
 * This implementation consists in an organization that have an owner and various members with
 * various roles. The organization is capable of issuing tokens (ERC20 compliant) or Crowdsales.
 * Tokens can be transfered to others accounts or others DAOs. Only members with a role grater
 * than or equal to ROLE_ADMIN can issue new tokens and crowdsales.
 *
 * Users can join the DAO with the role ROLE_MEMBER. They can be promoted to higher roles only by a
 * ROLE_ADMIN or a ROLE_OWNER. All writing operations can be performed only by users with ROLE_ADMIN
 * or higher.
 */
contract CcDAO {
    address public creator;
    string public name;
    string public firstlifePlaceID;

    TokenFactory public tokenFactory;
    CrowdsaleFactory public crowdsaleFactory;

    uint constant ROLE_OWNER = 40;
    uint constant ROLE_ADMIN = 30;
    uint constant ROLE_SUPERVISOR = 20;
    uint constant ROLE_MEMBER = 1;
    uint constant ROLE_NOTMEMBER = 0;

    mapping(address => uint) roles;

    constructor(
        TokenFactory _tokenFactory,
        CrowdsaleFactory _crowdsaleFactory,
        string memory _name,
        string memory _firstlifePlaceID,
        address _creator
    ) public {
        bytes memory testName = bytes(_name);
        bytes memory testPlaceID = bytes(_firstlifePlaceID);

        require(testName.length > 0, "DAO Name cannot be empty");
        require(testPlaceID.length > 0, "DAO must be connected to a firstlife Place by its ID");
        require(address(_tokenFactory) != address(0), "Must be a deployed TokenFactory");
        require(address(_crowdsaleFactory) != address(0), "Must be a deployed CrowdsaleFactory");

        name = _name;
        creator = _creator;
        firstlifePlaceID = _firstlifePlaceID;
        tokenFactory = _tokenFactory;
        crowdsaleFactory = _crowdsaleFactory;

        roles[creator] = ROLE_OWNER;
    }

    /**
     * @dev join allows an external user to join a DAO as MEMBER.
     */
    function join() public {
        require(roles[msg.sender] == ROLE_NOTMEMBER, "already a member, cannot join");

        roles[msg.sender] = ROLE_MEMBER;
    }

    /**
     * @dev kickMember allows a member to kick a lower-in-grade member.
     * @param _member the address of the member to kick.
     */
    function kickMember(address _member) public {
        require(roles[_member] > ROLE_NOTMEMBER, "not a member, cannot kick");
        require(roles[msg.sender] > roles[_member], "cannot kick my superiors");

        delete(roles[_member]);
    }

    /**
     * @dev demote allows a member to demote a lower-in-grade member to a specified lower role.
     * @param _member the address of the member to demote.
     * @param role the destination role of the demoted member, must be lower than actual role.
     */
    function demote(address _member, uint role) public {
        require(roles[_member] > ROLE_NOTMEMBER, "not a member, cannot demote");
        require(roles[msg.sender] > roles[_member], "cannot change privileges of my superiors");
        require(role < roles[_member], "not demoting to a higher rank");
        require(role > ROLE_NOTMEMBER, "there is kick function for that type of role");

        roles[_member] = role;
    }

    /**
     * @dev promote allows a member to demote a lower-in-grade member to a specified higher role.
     * @param _member the address of the member to demote.
     * @param role the destination role of the demoted member, must be higher than actual role.
     */
    function promote(address _member, uint role) public {
        require(roles[_member] > ROLE_NOTMEMBER, "not a member, cannot promote");
        require(roles[msg.sender] > roles[_member], "cannot change privileges of my superiors");
        require(role > roles[_member], "not promoting to a lower rank");
        require(role < ROLE_OWNER, "cannot promote to owner in any case");

        roles[_member] = role;
    }

    /**
     * @dev myRole gets the role of the caller.
     * @return the role of the caller.
     */
    function myRole() public view returns(uint) {
        return roles[msg.sender];
    }

    /**
     * @dev transferToken performs a token transfer.
     * @param _symbol the symbol of the token to transfer.
     * @param _amount the amount to transfer.
     * @param _to the destination address.
     */
    function transferToken(string memory _symbol, uint256 _amount, address _to) public {
        require(roles[msg.sender] >= ROLE_ADMIN, "Only admins or more can transfer money outside the wallet");

        address tokenAddr = address(0);
        (tokenAddr, , , , , , ) = tokenFactory.getToken(_symbol);
        TokenTemplate token = TokenTemplate(tokenAddr);
        require(token.balanceOf(address(this)) >= _amount, "Must have the tokens in the DAO wallet");
        require(token.transfer(_to, _amount), "Must have transferred the tokens");
    }

        /**
     * @dev createToken creates a new TokenTemplate instance.
     * @param _name the name of the Token
     * @param _symbol the symbol of the Token.
     * @param _logoURL the URL of the image representing the logo of the Token.
     * @param _logoHash the Hash of the image pointed by _logoURL, to ensure it has not been altered.
     * @param _hardCap the total supply of the Token.
     * @param _contractHash the Hash of the PDF contract bound to this Token.
     */
    function createToken(
        string memory _name,
        string memory _symbol,
        string memory _logoURL,
        bytes32 _logoHash,
        uint256 _hardCap,
        bytes32 _contractHash
        ) public {
        require(roles[msg.sender] >= ROLE_ADMIN, "Only admins or higher roles can issue new tokens");
        tokenFactory.createToken(_name, _symbol, 0, _logoURL, _logoHash, _hardCap, _contractHash);
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
     * @return the address of the created crowdsale.
     */
    function createCrowdsale(
        string memory _tokenToGive,
        string memory _tokenToAccept,
        uint256 _start, uint256 _end,
        uint8 _acceptRatio, uint8 _giveRatio,
        uint256 _maxCap
    ) public {
        address tokenGiveAddr = address(0);
        address tokenAcceptAddr = address(0);
        (tokenGiveAddr, , , , , , ) = tokenFactory.getToken(_tokenToGive);
        (tokenAcceptAddr, , , , , , ) = tokenFactory.getToken(_tokenToAccept);

        require(roles[msg.sender] >= ROLE_ADMIN, "Only admins or higher roles can create new crowdsales");
        require(tokenGiveAddr != address(0), "Must be a valid TokenToGive address");
        require(tokenAcceptAddr != address(0), "Must be a valid TokenToAccept address");

        crowdsaleFactory.createCrowdsale(tokenGiveAddr, tokenAcceptAddr, _start, _end, _acceptRatio, _giveRatio, _maxCap);
    }

    /**
     * @dev unlockCrowdsale unlocks the crowdsale if requirements are met.
     * @param crowdsaleAddress the address of the crowdsale.
     */
    function unlockCrowdsale(
        address crowdsaleAddress
    ) public {
        require(roles[msg.sender] >= ROLE_ADMIN, "Only admins or higher roles can unlock crowdsales");
        crowdsaleFactory.unlockCrowdsale(crowdsaleAddress);
    }

    /**
     * @dev stopCrowdsale sets the crowdsale as Stopped.
     * @param crowdsaleAddress the address of the crowdsale.
     */
    function stopCrowdsale(
        address crowdsaleAddress
    ) public {
        require(roles[msg.sender] >= ROLE_ADMIN, "Only admins or higher roles can stop crowdsales");
        crowdsaleFactory.stopCrowdsale(crowdsaleAddress);
    }

    /**
     * @dev joinCrowdsale allows the DAO to contribute by the specified amount of TokenToGive,
     *      if it passes the checks.
     * @param crowdsaleAddress the address of the crowdsale.
     * @param _amount the amount of TokenToAccept to join the crowdsale with.
     */
    function joinCrowdsale(
        address crowdsaleAddress,
        uint256 _amount
    ) public {
        require(roles[msg.sender] >= ROLE_ADMIN, "Only admins or higher roles can let the DAO join crowdsales");
        crowdsaleFactory.joinCrowdsale(crowdsaleAddress, _amount);
    }
}