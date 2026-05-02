// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MnemoLineageSplitter is ReentrancyGuard, Ownable {
    uint16 public constant SHARE_OWNER = 5000; // 50% to invoked agent's owner
    uint16 public constant SHARE_PARENTS = 3000; // 30% across parents
    uint16 public constant SHARE_GRANDS = 1500; // 15% across grandparents
    uint16 public constant SHARE_TREASURY = 500; //  5% to protocol
    uint16 public constant BASIS_POINTS = 10000;

    IMnemoAgentNFT public immutable agentNFT;
    address public treasury;

    mapping(address => uint256) public claimable;

    event InvocationPaid(
        uint256 indexed tokenId,
        address indexed payer,
        uint256 amount
    );
    event RoyaltyCredited(
        uint256 indexed tokenId,
        address indexed recipient,
        uint8 generation,
        uint256 amount
    );
    event Claimed(address indexed recipient, uint256 amount);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    error ZeroPayment();
    error ZeroAddress();
    error NothingToClaim();
    error TransferFailed();

    constructor(address _agentNFT, address _treasury) Ownable(msg.sender) {
        if (_agentNFT == address(0) || _treasury == address(0))
            revert ZeroAddress();
        agentNFT = IMnemoAgentNFT(_agentNFT);
        treasury = _treasury;
    }

    function payInvocation(uint256 tokenId) external payable nonReentrant {
        if (msg.value == 0) revert ZeroPayment();

        emit InvocationPaid(tokenId, msg.sender, msg.value);

        // Per-generation shares: gen0 = invoked owner, gen1 = parents, gen2 = grandparents
        uint256[3] memory shares = [
            (msg.value * SHARE_OWNER) / BASIS_POINTS,
            (msg.value * SHARE_PARENTS) / BASIS_POINTS,
            (msg.value * SHARE_GRANDS) / BASIS_POINTS
        ];

        uint256 distributed;
        uint256[] memory generation = new uint256[](1);
        generation[0] = tokenId;

        for (uint8 g = 0; g < 3; g++) {
            distributed += _distribute(generation, shares[g], tokenId, g);
            if (g < 2) generation = _expandToNextGen(generation);
        }

        // Treasury sweeps the rest: its 5% + any orphan/dust leftovers
        uint256 treasuryAmount = msg.value - distributed;
        if (treasuryAmount > 0) {
            claimable[treasury] += treasuryAmount;
            emit RoyaltyCredited(tokenId, treasury, 99, treasuryAmount);
        }
    }

    function _distribute(
        uint256[] memory ancestors,
        uint256 amount,
        uint256 originTokenId,
        uint8 generation
    ) internal returns (uint256 distributed) {
        uint256 living;
        for (uint256 i = 0; i < ancestors.length; i++) {
            if (ancestors[i] != 0) living++;
        }
        if (living == 0) return 0;

        uint256 perAncestor = amount / living;
        if (perAncestor == 0) return 0;

        for (uint256 i = 0; i < ancestors.length; i++) {
            if (ancestors[i] == 0) continue;

            address ancestorOwner;
            try agentNFT.ownerOf(ancestors[i]) returns (address o) {
                ancestorOwner = o;
            } catch {
                continue;
            }
            if (ancestorOwner == address(0)) continue;

            claimable[ancestorOwner] += perAncestor;
            emit RoyaltyCredited(
                originTokenId,
                ancestorOwner,
                generation,
                perAncestor
            );
            distributed += perAncestor;
        }
    }

    function _expandToNextGen(
        uint256[] memory current
    ) internal view returns (uint256[] memory next) {
        next = new uint256[](current.length * 2);
        uint256 idx;
        for (uint256 i = 0; i < current.length; i++) {
            if (current[i] == 0) {
                idx += 2;
                continue;
            }
            IMnemoAgentNFT.Lineage memory l = agentNFT.lineageOf(current[i]);
            next[idx++] = l.parent1;
            next[idx++] = l.parent2;
        }
    }

    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NothingToClaim();

        claimable[msg.sender] = 0;
        emit Claimed(msg.sender, amount);

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function previewSplit(
        uint256 tokenId,
        uint256 amount
    )
        external
        view
        returns (
            address ownerAddr,
            address[2] memory parents,
            address[4] memory grandparents,
            uint256 ownerAmount,
            uint256 parentsAmount,
            uint256 grandsAmount,
            uint256 treasuryAmount
        )
    {
        ownerAddr = agentNFT.ownerOf(tokenId);

        IMnemoAgentNFT.Lineage memory l = agentNFT.lineageOf(tokenId);
        uint256[2] memory parentIds = [l.parent1, l.parent2];

        for (uint256 i = 0; i < 2; i++) {
            if (parentIds[i] == 0) continue;
            parents[i] = agentNFT.ownerOf(parentIds[i]);

            IMnemoAgentNFT.Lineage memory pl = agentNFT.lineageOf(parentIds[i]);
            uint256 base = i * 2;
            if (pl.parent1 != 0)
                grandparents[base] = agentNFT.ownerOf(pl.parent1);
            if (pl.parent2 != 0)
                grandparents[base + 1] = agentNFT.ownerOf(pl.parent2);
        }

        ownerAmount = (amount * SHARE_OWNER) / BASIS_POINTS;
        parentsAmount = (amount * SHARE_PARENTS) / BASIS_POINTS;
        grandsAmount = (amount * SHARE_GRANDS) / BASIS_POINTS;
        treasuryAmount = (amount * SHARE_TREASURY) / BASIS_POINTS;
    }
}

interface IMnemoAgentNFT {
    struct Lineage {
        uint256 parent1;
        uint256 parent2;
        uint256 generation;
        address breeder;
        uint256 birthBlock;
    }

    function ownerOf(uint256 tokenId) external view returns (address);
    function lineageOf(uint256 tokenId) external view returns (Lineage memory);
}
