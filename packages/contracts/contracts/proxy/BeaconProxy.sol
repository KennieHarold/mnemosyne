// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {
    BeaconProxy as OZBeaconProxy
} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

contract BeaconProxy is OZBeaconProxy {
    constructor(address beacon, bytes memory data) payable OZBeaconProxy(beacon, data) {}
}
