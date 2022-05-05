// SPDX-License-Identifier: MIT LICENSE
pragma solidity >=0.8.0;

interface INameRegister {
    struct Info {
        address owner;
        uint256 lockedAmount;
        uint256 registrationExpiresAt;
        uint256 reserveExpiresAt;
    }

    function infos(bytes32 _hash)
        external
        view
        returns (
            address,
            uint256,
            uint256,
            uint256
        );

    function reserveName(string memory _name) external;

    function registerName(string memory _name) external payable;

    function renewName(string memory _name) external payable;

    function withdrawExpiredName(string memory _name) external;
}
