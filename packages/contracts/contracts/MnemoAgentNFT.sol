// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AgentNFT} from "./AgentNFT.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MnemoAgentNFT is AgentNFT {
    string private constant _NAME = "Mnemosyne Agents";
    string private constant _SYMBOL = "MNEMO";

    struct Lineage {
        uint256 parent1;
        uint256 parent2;
        uint256 generation;
        address breeder;
        uint256 birthBlock;
    }

    struct MnemoAgentNFTStorage {
        mapping(string => address) labelToAddress;
        mapping(string => uint256) labelToTokenId;
        mapping(uint256 => string) tokenIdToLabel;
        mapping(string => bool) labelTaken;
        mapping(string => mapping(string => string)) labelText;
        mapping(string => bool) reservedLabels;
        mapping(uint256 => Lineage) lineage;
        mapping(uint256 => uint256[]) children;
    }

    // keccak256(abi.encode(uint(keccak256("agent.storage.MnemoAgentNFT")) - 1)) & ~bytes32(uint(0xff))
    bytes32 private constant MNEMO_AGENT_NFT_STORAGE_LOCATION =
        0x056fd9b766381751453e856e178e6a31bebc85b06c3346484e0fd5926790ce00;

    event SubnameIssued(
        uint256 indexed tokenId,
        string label,
        address indexed holder
    );
    event SubnameTransferred(
        string label,
        address indexed from,
        address indexed to
    );
    event TextRecordSet(string indexed label, string indexed key, string value);
    event TextRecordCleared(string indexed label, string indexed key);
    event LabelReservedSet(string indexed label, bool reserved);
    event Bred(
        uint256 indexed childTokenId,
        uint256 indexed parent1,
        uint256 indexed parent2,
        address breeder,
        uint256 generation
    );

    function _getMnemoStorage()
        private
        pure
        returns (MnemoAgentNFTStorage storage $)
    {
        assembly {
            $.slot := MNEMO_AGENT_NFT_STORAGE_LOCATION
        }
    }

    function initialize(
        string memory,
        string memory,
        address verifierAddr,
        string memory chainURL_,
        string memory indexerURL_
    ) public override initializer {
        super.initialize(_NAME, _SYMBOL, verifierAddr, chainURL_, indexerURL_);
    }

    function mintWithSubname(
        bytes[] calldata proofs,
        string[] calldata dataDescriptions,
        address to,
        string calldata label
    ) public payable virtual returns (uint256 tokenId) {
        _validateLabel(label);

        MnemoAgentNFTStorage storage $$ = _getMnemoStorage();
        require(!$$.labelTaken[label], "Label taken");
        require(!$$.reservedLabels[label], "Label reserved");

        tokenId = mint(proofs, dataDescriptions, to);
        address holder = ownerOf(tokenId);

        $$.labelTaken[label] = true;
        $$.labelToAddress[label] = holder;
        $$.labelToTokenId[label] = tokenId;
        $$.tokenIdToLabel[tokenId] = label;

        emit SubnameIssued(tokenId, label, holder);
    }

    function breed(
        uint256 parent1Id,
        uint256 parent2Id,
        address to,
        bytes[] calldata proofs,
        string[] calldata dataDescriptions,
        string calldata label
    ) external virtual returns (uint256 childTokenId) {
        require(parent1Id != parent2Id, "Self-breeding not allowed");
        require(_exists(parent1Id), "Parent 1 missing");
        require(_exists(parent2Id), "Parent 2 missing");

        if (to == address(0)) {
            to = msg.sender;
        }

        childTokenId = mintWithSubname(proofs, dataDescriptions, to, label);

        MnemoAgentNFTStorage storage $$ = _getMnemoStorage();
        uint256 gen = _generationOf(parent1Id, parent2Id) + 1;
        $$.lineage[childTokenId] = Lineage({
            parent1: parent1Id,
            parent2: parent2Id,
            generation: gen,
            breeder: msg.sender,
            birthBlock: block.number
        });
        $$.children[parent1Id].push(childTokenId);
        $$.children[parent2Id].push(childTokenId);

        string memory parentsValue = string(
            abi.encodePacked(
                Strings.toString(parent1Id),
                ",",
                Strings.toString(parent2Id)
            )
        );
        $$.labelText[label]["parents"] = parentsValue;
        emit TextRecordSet(label, "parents", parentsValue);

        string memory generationValue = Strings.toString(gen);
        $$.labelText[label]["generation"] = generationValue;
        emit TextRecordSet(label, "generation", generationValue);

        string memory childIdStr = Strings.toString(childTokenId);
        _appendChildren(parent1Id, childIdStr);
        _appendChildren(parent2Id, childIdStr);

        emit Bred(childTokenId, parent1Id, parent2Id, msg.sender, gen);
    }

    function _appendChildren(
        uint256 parentId,
        string memory childIdStr
    ) private {
        MnemoAgentNFTStorage storage $$ = _getMnemoStorage();
        string memory parentLabel = $$.tokenIdToLabel[parentId];
        if (bytes(parentLabel).length == 0) {
            return;
        }

        string memory existing = $$.labelText[parentLabel]["children"];
        string memory updated = bytes(existing).length == 0
            ? childIdStr
            : string(abi.encodePacked(existing, ",", childIdStr));

        $$.labelText[parentLabel]["children"] = updated;
        emit TextRecordSet(parentLabel, "children", updated);
    }

    function lineageOf(
        uint256 tokenId
    ) external view virtual returns (Lineage memory) {
        return _getMnemoStorage().lineage[tokenId];
    }

    function childrenOf(
        uint256 tokenId
    ) external view virtual returns (uint256[] memory) {
        return _getMnemoStorage().children[tokenId];
    }

    function _generationOf(
        uint256 p1,
        uint256 p2
    ) private view returns (uint256) {
        MnemoAgentNFTStorage storage $$ = _getMnemoStorage();
        uint256 g1 = $$.lineage[p1].generation;
        uint256 g2 = $$.lineage[p2].generation;
        return g1 > g2 ? g1 : g2;
    }

    function setSubnameAddress(
        uint256 tokenId,
        address newAddr
    ) external virtual {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(newAddr != address(0), "Zero address");

        MnemoAgentNFTStorage storage $$ = _getMnemoStorage();
        string memory label = $$.tokenIdToLabel[tokenId];
        require(bytes(label).length > 0, "No subname");

        address old = $$.labelToAddress[label];
        $$.labelToAddress[label] = newAddr;
        emit SubnameTransferred(label, old, newAddr);
    }

    function setText(
        uint256 tokenId,
        string calldata key,
        string calldata value
    ) external virtual {
        require(ownerOf(tokenId) == msg.sender, "Not owner");

        MnemoAgentNFTStorage storage $$ = _getMnemoStorage();
        string memory label = $$.tokenIdToLabel[tokenId];
        require(bytes(label).length > 0, "No subname");

        if (bytes(value).length == 0) {
            delete $$.labelText[label][key];
            emit TextRecordCleared(label, key);
        } else {
            $$.labelText[label][key] = value;
            emit TextRecordSet(label, key, value);
        }
    }

    function setTexts(
        uint256 tokenId,
        string[] calldata keys,
        string[] calldata values
    ) external virtual {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(keys.length == values.length, "Length mismatch");

        MnemoAgentNFTStorage storage $$ = _getMnemoStorage();
        string memory label = $$.tokenIdToLabel[tokenId];
        require(bytes(label).length > 0, "No subname");

        for (uint i = 0; i < keys.length; i++) {
            if (bytes(values[i]).length == 0) {
                delete $$.labelText[label][keys[i]];
                emit TextRecordCleared(label, keys[i]);
            } else {
                $$.labelText[label][keys[i]] = values[i];
                emit TextRecordSet(label, keys[i], values[i]);
            }
        }
    }

    function setReserved(
        string calldata label,
        bool reserved
    ) external virtual onlyRole(ADMIN_ROLE) {
        _getMnemoStorage().reservedLabels[label] = reserved;
        emit LabelReservedSet(label, reserved);
    }

    function name() public pure override returns (string memory) {
        return _NAME;
    }

    function symbol() public pure override returns (string memory) {
        return _SYMBOL;
    }

    function addressForLabel(
        string calldata label
    ) external view virtual returns (address) {
        return _getMnemoStorage().labelToAddress[label];
    }

    function textForLabel(
        string calldata label,
        string calldata key
    ) external view virtual returns (string memory) {
        return _getMnemoStorage().labelText[label][key];
    }

    function labelForTokenId(
        uint256 tokenId
    ) external view virtual returns (string memory) {
        return _getMnemoStorage().tokenIdToLabel[tokenId];
    }

    function tokenIdForLabel(
        string calldata label
    ) external view virtual returns (uint256) {
        return _getMnemoStorage().labelToTokenId[label];
    }

    function isLabelTaken(
        string calldata label
    ) external view virtual returns (bool) {
        return _getMnemoStorage().labelTaken[label];
    }

    function isLabelReserved(
        string calldata label
    ) external view virtual returns (bool) {
        return _getMnemoStorage().reservedLabels[label];
    }

    function transfer(
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public virtual override {
        super.transfer(to, tokenId, proofs);
        _syncSubnameOwner(tokenId, to);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes[] calldata proofs
    ) public virtual override {
        super.transferFrom(from, to, tokenId, proofs);
        _syncSubnameOwner(tokenId, to);
    }

    function _syncSubnameOwner(uint256 tokenId, address to) internal {
        MnemoAgentNFTStorage storage $$ = _getMnemoStorage();
        string memory label = $$.tokenIdToLabel[tokenId];
        if (bytes(label).length == 0) {
            return;
        }

        address old = $$.labelToAddress[label];
        if (old == to) {
            return;
        }

        $$.labelToAddress[label] = to;
        emit SubnameTransferred(label, old, to);
    }

    /// @dev ENS-normalized label: lowercase a-z, 0-9, hyphen (not at edges), length 1..63.
    function _validateLabel(string calldata label) internal pure {
        bytes memory b = bytes(label);
        require(b.length > 0 && b.length <= 63, "Label invalid");
        for (uint i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool ok = (c >= 0x61 && c <= 0x7a) ||
                (c >= 0x30 && c <= 0x39) ||
                (c == 0x2d && i != 0 && i != b.length - 1);
            require(ok, "Label invalid");
        }
    }
}
