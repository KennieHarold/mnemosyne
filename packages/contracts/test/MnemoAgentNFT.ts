import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import { network } from "hardhat";
import {
  encodeFunctionData,
  getAddress,
  keccak256,
  toBytes,
  zeroAddress,
  type Address,
} from "viem";

const HARDCODED_NAME = "Mnemosyne Agents";
const HARDCODED_SYMBOL = "MNEMO";
const CHAIN_URL = "https://chain.example";
const INDEXER_URL = "https://indexer.example";

const proof = (seed: string) => keccak256(toBytes(seed));

describe("MnemoAgentNFT", async function () {
  const { viem } = await network.create({
    override: { allowUnlimitedContractSize: true },
  });
  const [deployer, alice, bob] = await viem.getWalletClients();

  let impl: Awaited<ReturnType<typeof viem.deployContract<"MnemoAgentNFT">>>;
  let verifier: Awaited<ReturnType<typeof viem.deployContract<"Verifier">>>;
  let agentAddress: Address;
  let nft: Awaited<ReturnType<typeof viem.getContractAt<"MnemoAgentNFT">>>;

  before(async function () {
    verifier = await viem.deployContract("Verifier", [zeroAddress, 0]);
    impl = await viem.deployContract("MnemoAgentNFT");

    const initData = encodeFunctionData({
      abi: impl.abi,
      functionName: "initialize",
      args: ["", "", verifier.address, CHAIN_URL, INDEXER_URL],
    });

    const beacon = await viem.deployContract("UpgradeableBeacon", [
      impl.address,
      deployer.account.address,
    ]);
    const proxy = await viem.deployContract("BeaconProxy", [
      beacon.address,
      initData,
    ]);
    agentAddress = getAddress(proxy.address);
    nft = await viem.getContractAt("MnemoAgentNFT", agentAddress);
  });

  describe("metadata", function () {
    it("returns the hardcoded name and symbol regardless of init args", async function () {
      assert.equal(await nft.read.name(), HARDCODED_NAME);
      assert.equal(await nft.read.symbol(), HARDCODED_SYMBOL);
    });
  });

  describe("mintWithSubname", function () {
    it("mints, registers the label, and resolves to the holder", async function () {
      const proofs = [proof("alice-weights")] as const;
      const descriptions = ["weights"];
      const label = "alice";
      const recipient = alice.account.address as Address;

      await viem.assertions.emitWithArgs(
        nft.write.mintWithSubname([proofs, descriptions, recipient, label]),
        nft,
        "SubnameIssued",
        [0n, label, getAddress(recipient)],
      );

      assert.equal(
        getAddress(await nft.read.ownerOf([0n])),
        getAddress(recipient),
      );
      assert.equal(
        getAddress(await nft.read.addressForLabel([label])),
        getAddress(recipient),
      );
      assert.equal(await nft.read.labelForTokenId([0n]), label);
      assert.equal(await nft.read.tokenIdForLabel([label]), 0n);
      assert.equal(await nft.read.isLabelTaken([label]), true);
    });

    it("rejects a label that is already taken", async function () {
      const proofs = [proof("dup-1")] as const;
      await viem.assertions.revertWith(
        nft.write.mintWithSubname([proofs, ["x"], zeroAddress, "alice"]),
        "Label taken",
      );
    });

    it("rejects a reserved label", async function () {
      await nft.write.setReserved(["admin", true]);
      const proofs = [proof("res-1")] as const;
      await viem.assertions.revertWith(
        nft.write.mintWithSubname([proofs, ["x"], zeroAddress, "admin"]),
        "Label reserved",
      );
    });

    it("rejects an invalid label (uppercase)", async function () {
      const proofs = [proof("inv-1")] as const;
      await viem.assertions.revertWith(
        nft.write.mintWithSubname([proofs, ["x"], zeroAddress, "Bob"]),
        "Label invalid",
      );
    });

    it("rejects an invalid label (leading hyphen)", async function () {
      const proofs = [proof("inv-2")] as const;
      await viem.assertions.revertWith(
        nft.write.mintWithSubname([proofs, ["x"], zeroAddress, "-bob"]),
        "Label invalid",
      );
    });
  });

  describe("setSubnameAddress", function () {
    it("owner can re-point the label to a new address", async function () {
      const asAlice = await viem.getContractAt("MnemoAgentNFT", agentAddress, {
        client: { wallet: alice },
      });

      await viem.assertions.emitWithArgs(
        asAlice.write.setSubnameAddress([0n, bob.account.address as Address]),
        nft,
        "SubnameTransferred",
        [
          "alice",
          getAddress(alice.account.address),
          getAddress(bob.account.address),
        ],
      );

      assert.equal(
        getAddress(await nft.read.addressForLabel(["alice"])),
        getAddress(bob.account.address),
      );
    });

    it("rejects callers that don't own the token", async function () {
      const asBob = await viem.getContractAt("MnemoAgentNFT", agentAddress, {
        client: { wallet: bob },
      });
      await viem.assertions.revertWith(
        asBob.write.setSubnameAddress([0n, bob.account.address as Address]),
        "Not owner",
      );
    });
  });

  describe("text records", function () {
    before(async function () {
      // Mint a fresh subname owned by bob so he can edit text records
      const proofs = [proof("bob-weights")] as const;
      await nft.write.mintWithSubname([
        proofs,
        ["weights"],
        bob.account.address as Address,
        "bob",
      ]);
    });

    it("setText writes a record and emits TextRecordSet", async function () {
      const asBob = await viem.getContractAt("MnemoAgentNFT", agentAddress, {
        client: { wallet: bob },
      });

      await asBob.write.setText([1n, "avatar", "ipfs://bob.png"]);
      assert.equal(
        await nft.read.textForLabel(["bob", "avatar"]),
        "ipfs://bob.png",
      );
    });

    it("setText with empty value clears the record", async function () {
      const asBob = await viem.getContractAt("MnemoAgentNFT", agentAddress, {
        client: { wallet: bob },
      });

      await asBob.write.setText([1n, "avatar", ""]);
      assert.equal(await nft.read.textForLabel(["bob", "avatar"]), "");
    });

    it("setTexts writes multiple records in one tx", async function () {
      const asBob = await viem.getContractAt("MnemoAgentNFT", agentAddress, {
        client: { wallet: bob },
      });

      await asBob.write.setTexts([
        1n,
        ["url", "description"],
        ["https://bob.example", "agent of bob"],
      ]);

      assert.equal(
        await nft.read.textForLabel(["bob", "url"]),
        "https://bob.example",
      );
      assert.equal(
        await nft.read.textForLabel(["bob", "description"]),
        "agent of bob",
      );
    });

    it("setTexts reverts when keys and values lengths differ", async function () {
      const asBob = await viem.getContractAt("MnemoAgentNFT", agentAddress, {
        client: { wallet: bob },
      });
      await viem.assertions.revertWith(
        asBob.write.setTexts([1n, ["a", "b"], ["only-one"]]),
        "Length mismatch",
      );
    });

    it("setText rejects non-owner callers", async function () {
      const asAlice = await viem.getContractAt("MnemoAgentNFT", agentAddress, {
        client: { wallet: alice },
      });
      await viem.assertions.revertWith(
        asAlice.write.setText([1n, "avatar", "x"]),
        "Not owner",
      );
    });
  });
});
