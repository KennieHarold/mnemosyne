// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC165 {
    function supportsInterface(bytes4 interfaceID) external pure returns (bool);
}

abstract contract SupportsInterface is IERC165 {
    function supportsInterface(
        bytes4 interfaceID
    ) public pure virtual override returns (bool) {
        return interfaceID == type(IERC165).interfaceId;
    }
}
