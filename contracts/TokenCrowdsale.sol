pragma solidity ^0.5.0;

import "./TokenTemplate.sol";

/**
 * @title TokenCrowdsale contract allows multiple entities to put money into, and
 *        when a certain cap is reached. It accepts a token and returns another token.
 */
contract TokenCrowdsale {
    TokenTemplate tokenToGive; // the crowdsale must own the token for security reasons.
    TokenTemplate tokenToAccept; // the crowdsale must accept a token as payment. or more than one?

    address public owner; // the owner of the crowsale.

    // start and end of the crowdsale.
    uint256 public start;
    uint256 public end;

    uint8 public acceptRatio;
    uint8 public giveRatio;

    mapping(address => uint256) internal reservations; // here we save the contributions from each person.
    address[] internal contributors; // the list of contributors.

    enum Status { RUNNING, STOPPED, LOCKED } //added enum to allow further options later.

    Status public status;

    uint256 public raised;      // reset when cap is reached.
    uint256 public maxCap;      // token will be given when reached.
    uint256 internal minFunds;  // minimum funds required for the contract to operate, in TokenToGive Tokens.

    event CapReached();
    event ContributionFrom(address indexed _from, uint256 _amount);
    event RefundTo(address indexed _to, uint256 _amount);

    constructor(
        TokenTemplate _tokenToGive,
        TokenTemplate _tokenToAccept,
        uint256 _start,
        uint256 _end,
        uint8 _acceptRatio,
        uint8 _giveRatio,
        uint256 _maxCap,
        address _owner
    ) public {
        require(_tokenToGive != _tokenToAccept && (_start < _end || _end == 0), "Parameters should be valid in constructor");

        owner = _owner;
        tokenToGive = _tokenToGive;
        tokenToAccept = _tokenToAccept;
        start = _start;
        end = _end;
        status = Status.LOCKED;
        acceptRatio = _acceptRatio;
        giveRatio = _giveRatio;
        raised = 0;
        maxCap = _maxCap;

        require(maxCap % acceptRatio == 0, "Max cap must be a multiple of acceptRatio");
        minFunds = maxCap / acceptRatio * giveRatio;
    }

    /**
     * @dev getMyReservation gets the reservation of the caller user.
     * @return the reservation of the caller user, in TokenToAccept.
     */
    function getMyReservation() public view returns (uint256) {
        return reservations[msg.sender];
    }

    /**
     * @dev getReservationsData, accessible only to the crowdsale owner, returns
     *      the reservations about all contributors.
     * @return the reservations of all contributors, in (address, TokenToAccept) parallel
     *         arrays.
     */
    function getReservationsData() public view returns (address[] memory, uint256[] memory) {
        require(msg.sender == owner, "Only owner can see total reservation data");
        uint256[] memory reservationArray = new uint256[](contributors.length);

        for (uint256 i = 0; i < contributors.length; i++) {
            reservationArray[i] = reservations[contributors[i]];
        }

        return (contributors, reservationArray);
    }

    /**
     * @dev joinRequisitesPassedCheck is a check to see if a contributor is eligible to contribute
     *      in the crowdsale. This includes time and other checks.
     */
    function joinRequisitesPassedCheck(address _contributor, uint256 _amount) internal view {
        // status == RUNNING : crowdsale must be running (not stopped)
        // tokenToAccept.transferFrom(tokenToAccept, address(this), _amount) : I must be able to transfer the money
        // end == 0 : crowdsale has no time (it is persistent unless stopped)
        require(msg.sender != owner, "Owner cannot join his own crowdsale");
        require(now >= start, "Crowdsale start must be passed");
        require(now <= end, "Crowdsale end must not be passed");
        require(status == Status.RUNNING, "the crowdsale must not be locked or stopped");
        require(amountValid(_contributor, _amount), "Amount must be valid");

        require(owner != msg.sender, "Owner cannot join his own crowdsale");
    }

    /**
     * @dev amountValid is true if there is no overflow.
     */
    function amountValid(address _contributor, uint256 _amount) internal view returns(bool) {
        // futureAmount > reservation[msg.sender] : avoid overflow attack
        uint256 futureAmount = reservations[msg.sender] + _amount;
        return futureAmount > reservations[_contributor];
    }

    /**
     * @dev stopCrowdsale sets the crowdsale as Stopped.
     */
    function stopCrowdsale() public {
        require(msg.sender == owner && status != Status.STOPPED, "Only owner can stop crowdsale, and it must not be already stopped");
        for (uint256 i = 0; i < contributors.length; i++) {
            address contr = contributors[i];
            refund(contr, reservations[contr]);
            reservations[contr] = 0;
        }
        tokenToGive.transfer(owner, tokenToGive.balanceOf(address(this)));
        status = Status.STOPPED;
    }

    /**
     * @dev unlockCrowdsale unlocks the crowdsale if requirements are met.
     */
    function unlockCrowdsale() public {
        // NOTE: beware if there are sent tokens After crowdsale stopped they are lost forever.
        require(status == Status.LOCKED, "Must be LOCKED");
        require(tokenToGive.balanceOf(address(this)) >= minFunds, "Crowdsale must have sufficient funds before unlocking");

        status = Status.RUNNING;
    }

    /**
     * @dev refundMe refunds the pending contribution to the user, in the
     *      specified amount.
     * @param _amount the amount of TokenToAccept to refund.
     */
    function refundMe(uint256 _amount) public {
        refund(msg.sender, _amount);
    }

    /**
     * @dev refund performs a generic refund to an address.
     * @param _amount the amount of TokenToAccept to refund.
     */
    function refund(address _to, uint256 _amount) internal {
        uint256 netAmount = reservations[_to] - _amount;

        require(_amount % acceptRatio == 0, "Can only ask refund for a multiple of acceptRatio");
        require(netAmount <= reservations[_to], "Must have some funds to refund");

        // FIXME: reentrable.
        require(tokenToAccept.transfer(_to, _amount), "Must transfer tokens");

        reservations[_to] = netAmount;

        raised -= _amount;

        emit RefundTo(_to, _amount);
    }

    /**
     * @dev joinCrowdsale allows the user to contribute by the specified amount of TokenToGive,
     *      if it passes the checks.
     * @param _amount the amount of TokenToAccept to contribute with.
     */
    function joinCrowdsale(uint256 _amount) public {
        joinRequisitesPassedCheck(msg.sender, _amount);

        uint256 actualAmount;
        if (raised + _amount < maxCap) { // cap not reached, else only the difference is transferred, the rest is given back
            actualAmount = _amount;
        } else {
            actualAmount = maxCap - raised;
        }
        require(actualAmount % acceptRatio == 0, "Must join with an amount which is a multiple of acceptRatio");

        require(tokenToAccept.transferFrom(address(msg.sender), address(this), actualAmount), "Tokens must be transferred");

        emit ContributionFrom(msg.sender, actualAmount);
        uint256 newRaised = raised + actualAmount;

        // if I dont have left funds I stop the crowdsale.
        require(tokenToGive.balanceOf(address(this)) >= minFunds, "Crowdsale has no funds");

        // here tokens are already sent and just need to be counted for contribution.
        if (reservations[msg.sender] == 0) {
            contributors.push(msg.sender);
        }
        reservations[msg.sender] += actualAmount;
        raised += actualAmount;

        if(raised == maxCap) { // reached the cap
            emit CapReached();

            for (uint256 i = 0; i < contributors.length; i++) {
                address contr = contributors[i];
                uint256 howManyToMint = reservations[contr] / acceptRatio * giveRatio;

                if (howManyToMint > 0) {
                    reservations[contr] = 0;
                    require(tokenToGive.transfer(contr, howManyToMint), "Must transfer tokens");
                }
            }

            raised = newRaised;
            status = Status.STOPPED;
        }
    }
}