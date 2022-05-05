// SPDX-License-Identifier: MIT LICENSE
pragma solidity >=0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';

import './interfaces/INameRegister.sol';

contract NameRegister is INameRegister, Ownable {
    /* ======== STATS ======== */
    uint256 constant LENGTH_MULTIPLIER = 1e18;
    uint256 constant LENGTH_FACTOR = 1e16;

    // registration valid duration factor: ex 1s = lock durationFactor
    uint256 public durationFactor;

    // reserve valid duration
    uint256 public reserveDuration;

    // name hash => owner, amount, expires
    mapping(bytes32 => Info) public override infos;

    // fee
    uint256 public totalFee;

    /* ======= CONSTRUCTOR ======= */
    constructor(uint256 _durationFactor, uint256 _reserveDuration) {
        require(
            _durationFactor > 0 && _reserveDuration > 0,
            'Invalid duration'
        );

        durationFactor = _durationFactor;
        reserveDuration = _reserveDuration;
    }

    ///////////////////////////////////////////////////////
    //                USER CALLED FUNCTIONS              //
    ///////////////////////////////////////////////////////

    function reserveName(string memory _name) external override {
        bytes32 _hash = keccak256(abi.encodePacked(_name));
        Info storage info = infos[_hash];

        // check registered
        require(
            info.registrationExpiresAt < block.timestamp,
            'Name already registered'
        );
        // check reserved
        require(
            info.reserveExpiresAt < block.timestamp,
            'Name already reserved'
        );

        // return locked balance
        if (info.lockedAmount > 0) {
            _returnLocked(_hash);
        }

        info.owner = msg.sender;
        info.reserveExpiresAt = block.timestamp + reserveDuration;
    }

    function registerName(string memory _name) external payable override {
        bytes32 _hash = keccak256(abi.encodePacked(_name));
        Info memory info = infos[_hash];

        // check if reserve's owner
        require(info.owner == msg.sender, 'Incorrect owner');
        // check registered
        require(
            info.registrationExpiresAt < block.timestamp,
            'Name already registered'
        );
        // check if reserve expired
        require(
            info.reserveExpiresAt >= block.timestamp,
            'Name reserve expired'
        );

        _registerName(_hash, bytes(_name).length);
    }

    function renewName(string memory _name) external payable override {
        bytes32 _hash = keccak256(abi.encodePacked(_name));
        Info memory info = infos[_hash];

        // check same owner
        require(info.owner == msg.sender, 'Not owner');
        // check if it's expired
        require(
            info.registrationExpiresAt >= block.timestamp,
            'Name registration expired'
        );

        _returnLocked(_hash);
        _registerName(_hash, bytes(_name).length);
    }

    function withdrawExpiredName(string memory _name) external override {
        bytes32 _hash = keccak256(abi.encodePacked(_name));
        Info memory info = infos[_hash];

        // check locked amount
        require(info.lockedAmount > 0, 'Zero locked');
        // check same owner
        require(info.owner == msg.sender, 'Not owner');
        // check if it's expired
        require(
            info.registrationExpiresAt < block.timestamp,
            'Name registration not expired'
        );

        _returnLocked(_hash);
    }

    ///////////////////////////////////////////////////////
    //               MANAGER CALLED FUNCTIONS            //
    ///////////////////////////////////////////////////////

    function setDurations(uint256 _durationFactor, uint256 _reserveDuration)
        external
        onlyOwner
    {
        require(
            _durationFactor > 0 && _reserveDuration > 0,
            'Invalid duration'
        );

        durationFactor = _durationFactor;
        reserveDuration = _reserveDuration;
    }

    function withdrawFee(address payable _to) external onlyOwner {
        uint256 fee = totalFee;
        if (totalFee > 0) {
            totalFee = 0;
            (bool success, ) = _to.call{value: fee}('');
            require(success, 'Withdraw failed');
        }
    }

    ///////////////////////////////////////////////////////
    //               INTERNAL CALLED FUNCTIONS           //
    ///////////////////////////////////////////////////////

    function _registerName(bytes32 _hash, uint256 _length) internal {
        uint256 fee = (msg.value * _length * LENGTH_FACTOR) / LENGTH_MULTIPLIER;
        uint256 lockedAmount = msg.value - fee;
        uint256 duration = lockedAmount / durationFactor;

        // check duration period
        require(duration > 0, 'Low lock amount');

        infos[_hash].lockedAmount = lockedAmount;
        infos[_hash].registrationExpiresAt = block.timestamp + duration;

        totalFee += fee;
    }

    function _returnLocked(bytes32 _hash) internal {
        uint256 amount = infos[_hash].lockedAmount;

        if (amount > 0) {
            infos[_hash].lockedAmount = 0;
            (bool success, ) = payable(infos[_hash].owner).call{value: amount}(
                ''
            );
            require(success, 'Return failed');
        }
    }
}
