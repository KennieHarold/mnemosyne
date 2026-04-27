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

const NAME = "Mnemosyne Agents";
const SYMBOL = "MNEMO";
const CHAIN_URL = "https://chain.example";
const INDEXER_URL = "https://indexer.example";

const proof = (seed: string) => keccak256(toBytes(seed));

describe("AgentNFT", async function () {
  const { viem } = await network.create();
  const [deployer, alice, bob] = await viem.getWalletClients();

  let impl: Awaited<ReturnType<typeof viem.deployContract<"AgentNFT">>>;
  let verifier: Awaited<ReturnType<typeof viem.deployContract<"Verifier">>>;
  let agentAddress: Address;
  let agentNFT: Awaited<ReturnType<typeof viem.getContractAt<"AgentNFT">>>;

  async function deployAgentProxy(initData: Address): Promise<Address> {
    const beacon = await viem.deployContract("UpgradeableBeacon", [
      impl.address,
      deployer.account.address,
    ]);
    const proxy = await viem.deployContract("BeaconProxy", [
      beacon.address,
      initData,
    ]);
    return getAddress(proxy.address);
  }

  before(async function () {
    verifier = await viem.deployContract("Verifier", [zeroAddress, 0]);
    impl = await viem.deployContract("AgentNFT");

    const initData = encodeFunctionData({
      abi: impl.abi,
      functionName: "initialize",
      args: [NAME, SYMBOL, verifier.address, CHAIN_URL, INDEXER_URL],
    });
    agentAddress = await deployAgentProxy(initData);
    agentNFT = await viem.getContractAt("AgentNFT", agentAddress);
  });

  describe("Deployment", function () {
    it("sets the name and symbol", async function () {
      assert.equal(await agentNFT.read.name(), NAME);
      assert.equal(await agentNFT.read.symbol(), SYMBOL);
    });

    it("sets the verifier address", async function () {
      assert.equal(
        getAddress(await agentNFT.read.verifier()),
        getAddress(verifier.address),
      );
    });

    it("grants admin roles to the deployer", async function () {
      const DEFAULT_ADMIN_ROLE =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
      const ADMIN_ROLE = await agentNFT.read.ADMIN_ROLE();
      const deployerAddr = deployer.account.address;

      assert.equal(
        await agentNFT.read.hasRole([DEFAULT_ADMIN_ROLE, deployerAddr]),
        true,
      );
      assert.equal(
        await agentNFT.read.hasRole([ADMIN_ROLE, deployerAddr]),
        true,
      );
    });

    it("exposes the version constant", async function () {
      assert.equal(await agentNFT.read.VERSION(), "1.0.0");
    });

    it("reverts initialize with a zero verifier address", async function () {
      const badInit = encodeFunctionData({
        abi: impl.abi,
        functionName: "initialize",
        args: [NAME, SYMBOL, zeroAddress, CHAIN_URL, INDEXER_URL],
      });

      // The proxy bubbles up the implementation revert during construction.
      const beacon = await viem.deployContract("UpgradeableBeacon", [
        impl.address,
        deployer.account.address,
      ]);
      await viem.assertions.revertWith(
        viem.deployContract("BeaconProxy", [beacon.address, badInit]),
        "Zero address",
      );
    });

    it("reverts on a second initialize call", async function () {
      // OZ Initializable v5 emits a custom error InvalidInitialization()
      await viem.assertions.revertWithCustomError(
        agentNFT.write.initialize([
          NAME,
          SYMBOL,
          verifier.address,
          CHAIN_URL,
          INDEXER_URL,
        ]),
        agentNFT,
        "InvalidInitialization",
      );
    });
  });

  describe("Storage updates", function () {
    it("admin can update the verifier", async function () {
      const newVerifier = await viem.deployContract("Verifier", [
        zeroAddress,
        0,
      ]);
      await agentNFT.write.updateVerifier([newVerifier.address]);
      assert.equal(
        getAddress(await agentNFT.read.verifier()),
        getAddress(newVerifier.address),
      );

      // restore for downstream tests
      await agentNFT.write.updateVerifier([verifier.address]);
    });

    it("rejects updateVerifier with the zero address", async function () {
      await viem.assertions.revertWith(
        agentNFT.write.updateVerifier([zeroAddress]),
        "Zero address",
      );
    });

    it("rejects updateVerifier from a non-admin caller", async function () {
      const asAlice = await viem.getContractAt("AgentNFT", agentAddress, {
        client: { wallet: alice },
      });
      await viem.assertions.revertWithCustomError(
        asAlice.write.updateVerifier([verifier.address]),
        asAlice,
        "AccessControlUnauthorizedAccount",
      );
    });

    it("admin can update URLs", async function () {
      const newChain = "https://chain2.example";
      const newIndexer = "https://indexer2.example";
      await agentNFT.write.updateURLS([newChain, newIndexer]);
      // restore for any later tests
      await agentNFT.write.updateURLS([CHAIN_URL, INDEXER_URL]);
    });
  });

  describe("mint", function () {
    it("mints a token to msg.sender when `to` is the zero address", async function () {
      const proofs = [proof("alice-1"), proof("alice-2")] as const;
      const descriptions = ["weights", "config"];

      const expectedTokenId = 0n;

      await viem.assertions.emitWithArgs(
        agentNFT.write.mint([proofs, descriptions, zeroAddress]),
        agentNFT,
        "Minted",
        [
          expectedTokenId,
          getAddress(deployer.account.address),
          getAddress(deployer.account.address),
          [...proofs],
          descriptions,
        ],
      );

      assert.equal(
        getAddress(await agentNFT.read.ownerOf([expectedTokenId])),
        getAddress(deployer.account.address),
      );
      assert.deepEqual(await agentNFT.read.dataHashesOf([expectedTokenId]), [
        ...proofs,
      ]);
      assert.deepEqual(
        await agentNFT.read.dataDescriptionsOf([expectedTokenId]),
        descriptions,
      );
      assert.deepEqual(
        await agentNFT.read.authorizedUsersOf([expectedTokenId]),
        [],
      );
      assert.equal(
        await agentNFT.read.getApproved([expectedTokenId]),
        zeroAddress,
      );
    });

    it("mints a token to an explicit recipient", async function () {
      const proofs = [proof("bob-1")] as const;
      const descriptions = ["dataset"];
      const recipient = bob.account.address as Address;

      const expectedTokenId = 1n;

      await agentNFT.write.mint([proofs, descriptions, recipient]);

      assert.equal(
        getAddress(await agentNFT.read.ownerOf([expectedTokenId])),
        getAddress(recipient),
      );
      assert.deepEqual(await agentNFT.read.dataHashesOf([expectedTokenId]), [
        ...proofs,
      ]);
    });

    it("increments the token id on each mint", async function () {
      const proofs = [proof("seq-1")] as const;
      const descriptions = ["x"];

      await agentNFT.write.mint([proofs, descriptions, zeroAddress]);
      assert.equal(
        getAddress(await agentNFT.read.ownerOf([2n])),
        getAddress(deployer.account.address),
      );

      await agentNFT.write.mint([proofs, descriptions, zeroAddress]);
      assert.equal(
        getAddress(await agentNFT.read.ownerOf([3n])),
        getAddress(deployer.account.address),
      );
    });

    it("reverts when descriptions and proofs lengths differ", async function () {
      const proofs = [proof("len-1"), proof("len-2")] as const;
      const descriptions = ["only-one"];

      await viem.assertions.revertWith(
        agentNFT.write.mint([proofs, descriptions, zeroAddress]),
        "Descriptions and proofs length mismatch",
      );
    });

    it("ownerOf reverts for a non-existent token", async function () {
      await viem.assertions.revertWith(
        agentNFT.read.ownerOf([9999n]),
        "Token not exist",
      );
    });
  });
});
