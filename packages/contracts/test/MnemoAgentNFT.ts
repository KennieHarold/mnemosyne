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

  describe("breed", function () {
    let parent1Id: bigint;
    let parent2Id: bigint;
    let childId: bigint;

    before(async function () {
      parent1Id = await nft.read.nextTokenId();
      await nft.write.mintWithSubname([
        [proof("breed-parent-1")],
        ["weights"],
        alice.account.address as Address,
        "parent-one",
      ]);
      parent2Id = await nft.read.nextTokenId();
      await nft.write.mintWithSubname([
        [proof("breed-parent-2")],
        ["weights"],
        alice.account.address as Address,
        "parent-two",
      ]);
    });

    it("mints the child via mintWithSubname and emits Bred", async function () {
      childId = await nft.read.nextTokenId();
      const recipient = alice.account.address as Address;

      await viem.assertions.emitWithArgs(
        nft.write.breed([
          parent1Id,
          parent2Id,
          recipient,
          [proof("breed-child-1")],
          ["weights"],
          "child-one",
        ]),
        nft,
        "Bred",
        [
          childId,
          parent1Id,
          parent2Id,
          getAddress(deployer.account.address),
          1n,
        ],
      );

      assert.equal(
        getAddress(await nft.read.ownerOf([childId])),
        getAddress(recipient),
      );
      assert.equal(await nft.read.labelForTokenId([childId]), "child-one");
      assert.equal(await nft.read.tokenIdForLabel(["child-one"]), childId);
    });

    it("records lineage with generation = max(p1, p2) + 1", async function () {
      const lineage = await nft.read.lineageOf([childId]);
      assert.equal(lineage.parent1, parent1Id);
      assert.equal(lineage.parent2, parent2Id);
      assert.equal(lineage.generation, 1n);
      assert.equal(
        getAddress(lineage.breeder),
        getAddress(deployer.account.address),
      );
    });

    it("appends the child to childrenOf for both parents", async function () {
      assert.deepEqual(
        [...(await nft.read.childrenOf([parent1Id]))],
        [childId],
      );
      assert.deepEqual(
        [...(await nft.read.childrenOf([parent2Id]))],
        [childId],
      );
    });

    it("sets parents and generation text records on the child's label", async function () {
      assert.equal(
        await nft.read.textForLabel(["child-one", "parents"]),
        `${parent1Id},${parent2Id}`,
      );
      assert.equal(
        await nft.read.textForLabel(["child-one", "generation"]),
        "1",
      );
    });

    it("appends the child id to each parent's children text record", async function () {
      assert.equal(
        await nft.read.textForLabel(["parent-one", "children"]),
        `${childId}`,
      );
      assert.equal(
        await nft.read.textForLabel(["parent-two", "children"]),
        `${childId}`,
      );
    });

    it("appends to an existing children record rather than overwriting", async function () {
      const parent3Id = await nft.read.nextTokenId();
      await nft.write.mintWithSubname([
        [proof("breed-parent-3")],
        ["weights"],
        alice.account.address as Address,
        "parent-three",
      ]);

      const child2Id = await nft.read.nextTokenId();
      await nft.write.breed([
        parent1Id,
        parent3Id,
        alice.account.address as Address,
        [proof("breed-child-2")],
        ["weights"],
        "child-two",
      ]);

      assert.equal(
        await nft.read.textForLabel(["parent-one", "children"]),
        `${childId},${child2Id}`,
      );
      assert.deepEqual(
        [...(await nft.read.childrenOf([parent1Id]))],
        [childId, child2Id],
      );
    });

    it("computes generation across multiple levels of lineage", async function () {
      const parent4Id = await nft.read.nextTokenId();
      await nft.write.mintWithSubname([
        [proof("breed-parent-4")],
        ["weights"],
        alice.account.address as Address,
        "parent-four",
      ]);

      const grandchildId = await nft.read.nextTokenId();
      await nft.write.breed([
        childId,
        parent4Id,
        alice.account.address as Address,
        [proof("breed-grand-1")],
        ["weights"],
        "grandchild-one",
      ]);

      const lineage = await nft.read.lineageOf([grandchildId]);
      assert.equal(lineage.generation, 2n);
      assert.equal(
        await nft.read.textForLabel(["grandchild-one", "generation"]),
        "2",
      );
    });

    it("reverts when breeding a token with itself", async function () {
      await viem.assertions.revertWith(
        nft.write.breed([
          parent1Id,
          parent1Id,
          zeroAddress,
          [proof("self-breed")],
          ["weights"],
          "self-bred",
        ]),
        "Self-breeding not allowed",
      );
    });

    it("reverts when a parent does not exist", async function () {
      await viem.assertions.revertWith(
        nft.write.breed([
          parent1Id,
          9999n,
          zeroAddress,
          [proof("missing-parent")],
          ["weights"],
          "missing-parent",
        ]),
        "Parent 2 missing",
      );
    });
  });
});
