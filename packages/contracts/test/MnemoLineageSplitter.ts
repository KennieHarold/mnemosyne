import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

import { network } from "hardhat";
import {
  encodeFunctionData,
  getAddress,
  keccak256,
  parseEther,
  toBytes,
  zeroAddress,
  type Address,
} from "viem";

const CHAIN_URL = "https://chain.example";
const INDEXER_URL = "https://indexer.example";

const proof = (seed: string) => keccak256(toBytes(seed));

describe("MnemoLineageSplitter.payInvocation", async function () {
  const { viem } = await network.create({
    override: { allowUnlimitedContractSize: true },
  });
  const [deployer, alice, bob, carol, dave, eve, treasury, payer] =
    await viem.getWalletClients();

  let nft: Awaited<ReturnType<typeof viem.getContractAt<"MnemoAgentNFT">>>;
  let splitter: Awaited<
    ReturnType<typeof viem.deployContract<"MnemoLineageSplitter">>
  >;

  const ALICE_ID = 1n;
  const PAB_ID = 5n;
  const CHILD_FULL_ID = 7n;
  const CHILD_ASYM_ID = 8n;

  before(async function () {
    const verifier = await viem.deployContract("Verifier", [zeroAddress, 0]);
    const impl = await viem.deployContract("MnemoAgentNFT");
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
    nft = await viem.getContractAt("MnemoAgentNFT", getAddress(proxy.address));

    splitter = await viem.deployContract("MnemoLineageSplitter", [
      nft.address,
      treasury.account.address,
    ]);

    const seed = (label: string, owner: typeof alice) =>
      nft.write.mintWithSubname([
        [proof(`${label}-seed`)],
        ["w"],
        owner.account.address as Address,
        label,
      ]);

    await seed("burn-zero", deployer); // token id 0 — reserved by the splitter
    await seed("alice", alice);
    await seed("bob", bob);
    await seed("carol", carol);
    await seed("dave", dave);

    await nft.write.breed([
      1n,
      2n,
      alice.account.address as Address,
      [proof("p-ab")],
      ["w"],
      "p-ab",
    ]);
    await nft.write.breed([
      3n,
      4n,
      carol.account.address as Address,
      [proof("p-cd")],
      ["w"],
      "p-cd",
    ]);
    await nft.write.breed([
      5n,
      6n,
      eve.account.address as Address,
      [proof("child-full")],
      ["w"],
      "child-full",
    ]);
    await nft.write.breed([
      5n,
      3n,
      dave.account.address as Address,
      [proof("child-asym")],
      ["w"],
      "child-asym",
    ]);
  });

  it("reverts when msg.value is zero", async function () {
    await viem.assertions.revertWithCustomError(
      splitter.write.payInvocation([ALICE_ID], { value: 0n }),
      splitter,
      "ZeroPayment",
    );
  });

  it("emits InvocationPaid with the payer and amount", async function () {
    const asPayer = await viem.getContractAt(
      "MnemoLineageSplitter",
      splitter.address,
      { client: { wallet: payer } },
    );
    const amount = parseEther("0.01");

    await viem.assertions.emitWithArgs(
      asPayer.write.payInvocation([ALICE_ID], { value: amount }),
      splitter,
      "InvocationPaid",
      [ALICE_ID, getAddress(payer.account.address), amount],
    );
  });

  it("on a gen-0 token, credits owner 50% and sweeps the rest to treasury", async function () {
    const aliceBefore = await splitter.read.claimable([alice.account.address]);
    const treasuryBefore = await splitter.read.claimable([
      treasury.account.address,
    ]);
    const amount = parseEther("1");

    await splitter.write.payInvocation([ALICE_ID], { value: amount });

    const aliceAfter = await splitter.read.claimable([alice.account.address]);
    const treasuryAfter = await splitter.read.claimable([
      treasury.account.address,
    ]);

    // owner=alice gets 50%; parents/grands have no living ancestors, so the
    // remaining 50% is swept to treasury (5% base + 45% orphaned).
    assert.equal(aliceAfter - aliceBefore, amount / 2n);
    assert.equal(treasuryAfter - treasuryBefore, amount / 2n);
  });

  it("on a gen-1 token, credits owner + parents and sweeps the orphan grandparent share to treasury", async function () {
    const aliceBefore = await splitter.read.claimable([alice.account.address]);
    const bobBefore = await splitter.read.claimable([bob.account.address]);
    const treasuryBefore = await splitter.read.claimable([
      treasury.account.address,
    ]);
    const amount = parseEther("1");

    await splitter.write.payInvocation([PAB_ID], { value: amount });

    const aliceAfter = await splitter.read.claimable([alice.account.address]);
    const bobAfter = await splitter.read.claimable([bob.account.address]);
    const treasuryAfter = await splitter.read.claimable([
      treasury.account.address,
    ]);

    const ownerShare = (amount * 5000n) / 10000n;
    const perParent = (amount * 3000n) / 10000n / 2n;
    const grandsShare = (amount * 1500n) / 10000n;
    const treasuryBase = (amount * 500n) / 10000n;

    // alice = owner share + one parent share (she owns token 0)
    assert.equal(aliceAfter - aliceBefore, ownerShare + perParent);
    // bob = one parent share (he owns token 1)
    assert.equal(bobAfter - bobBefore, perParent);
    // treasury = 5% base + the entire 15% grandparent slice (no living grandparents)
    assert.equal(treasuryAfter - treasuryBefore, treasuryBase + grandsShare);
  });

  it("on a gen-2 token with full lineage, distributes owner / parents / grandparents / treasury", async function () {
    const before = {
      eve: await splitter.read.claimable([eve.account.address]),
      alice: await splitter.read.claimable([alice.account.address]),
      bob: await splitter.read.claimable([bob.account.address]),
      carol: await splitter.read.claimable([carol.account.address]),
      dave: await splitter.read.claimable([dave.account.address]),
      treasury: await splitter.read.claimable([treasury.account.address]),
    };
    const amount = parseEther("1");

    await splitter.write.payInvocation([CHILD_FULL_ID], { value: amount });

    const after = {
      eve: await splitter.read.claimable([eve.account.address]),
      alice: await splitter.read.claimable([alice.account.address]),
      bob: await splitter.read.claimable([bob.account.address]),
      carol: await splitter.read.claimable([carol.account.address]),
      dave: await splitter.read.claimable([dave.account.address]),
      treasury: await splitter.read.claimable([treasury.account.address]),
    };

    const ownerShare = (amount * 5000n) / 10000n; // 50%
    const perParent = (amount * 3000n) / 10000n / 2n; // 15% each
    const perGrand = (amount * 1500n) / 10000n / 4n; // 3.75% each
    const treasuryShare = (amount * 500n) / 10000n; // 5%

    assert.equal(after.eve - before.eve, ownerShare);
    assert.equal(after.alice - before.alice, perParent + perGrand);
    assert.equal(after.carol - before.carol, perParent + perGrand);
    assert.equal(after.bob - before.bob, perGrand);
    assert.equal(after.dave - before.dave, perGrand);
    assert.equal(after.treasury - before.treasury, treasuryShare);
  });

  it("on a gen-2 token with asymmetric lineage, splits the grand share across only the living grandparents", async function () {
    const before = {
      dave: await splitter.read.claimable([dave.account.address]),
      alice: await splitter.read.claimable([alice.account.address]),
      bob: await splitter.read.claimable([bob.account.address]),
      carol: await splitter.read.claimable([carol.account.address]),
      treasury: await splitter.read.claimable([treasury.account.address]),
    };
    const amount = parseEther("1");

    await splitter.write.payInvocation([CHILD_ASYM_ID], { value: amount });

    const after = {
      dave: await splitter.read.claimable([dave.account.address]),
      alice: await splitter.read.claimable([alice.account.address]),
      bob: await splitter.read.claimable([bob.account.address]),
      carol: await splitter.read.claimable([carol.account.address]),
      treasury: await splitter.read.claimable([treasury.account.address]),
    };

    const ownerShare = (amount * 5000n) / 10000n; // 50%
    const perParent = (amount * 3000n) / 10000n / 2n; // 15% each
    const perGrand = (amount * 1500n) / 10000n / 2n; // 7.5% each (2 living)
    const treasuryShare = (amount * 500n) / 10000n; // 5%, no orphan dust at this amount

    assert.equal(after.dave - before.dave, ownerShare);
    assert.equal(after.alice - before.alice, perParent + perGrand);
    assert.equal(after.carol - before.carol, perParent);
    assert.equal(after.bob - before.bob, perGrand);
    assert.equal(after.treasury - before.treasury, treasuryShare);
  });

  it("preserves the invariant: sum of all credits equals msg.value", async function () {
    const recipients = [
      alice.account.address,
      bob.account.address,
      carol.account.address,
      dave.account.address,
      eve.account.address,
      treasury.account.address,
    ] as const;

    const snapshot = async () =>
      Promise.all(recipients.map((r) => splitter.read.claimable([r])));

    const before = await snapshot();
    const amount = parseEther("0.37"); // odd-ish amount to surface dust handling

    await splitter.write.payInvocation([CHILD_FULL_ID], { value: amount });

    const after = await snapshot();
    const total = after.reduce((acc, v, i) => acc + (v - before[i]), 0n);
    assert.equal(total, amount);
  });
});
