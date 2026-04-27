// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {
    UpgradeableBeacon as OZUpgradeableBeacon
} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

contract UpgradeableBeacon is OZUpgradeableBeacon {
    constructor(
        address implementation_,
        address initialOwner
    ) OZUpgradeableBeacon(implementation_, initialOwner) {}
}
