import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

import { EncryptedPeerReview, EncryptedPeerReview__factory } from "../types";

type Signers = {
  manager: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedPeerReview")) as EncryptedPeerReview__factory;
  const contract = (await factory.deploy()) as EncryptedPeerReview;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("EncryptedPeerReview", function () {
  let signers: Signers;
  let contract: EncryptedPeerReview;
  let contractAddress: string;

  before(async function () {
    const all = (await ethers.getSigners()) as HardhatEthersSigner[];
    signers = { manager: all[0], alice: all[1], bob: all[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("EncryptedPeerReview test suite requires the FHEVM mock environment");
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("initialises with zero participants", async function () {
    const participantCount = await contract.participantCount();
    expect(participantCount).to.equal(0);

    const managerHasSubmitted = await contract.hasSubmitted(signers.manager.address);
    expect(managerHasSubmitted).to.equal(false);
  });

  it("accepts encrypted submissions, aggregates totals, and computes averages", async function () {
    await fhevm.initializeCLIApi();

    const aliceScore = 80;
    const bobScore = 60;

    const aliceEncrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(aliceScore)
      .encrypt();

    await (await contract.connect(signers.alice).submitScore(aliceEncrypted.handles[0], aliceEncrypted.inputProof)).wait();

    const afterAlice = await contract.connect(signers.alice).getEncryptedAverage();
    const aliceAverage = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      afterAlice[0],
      contractAddress,
      signers.alice,
    );
    expect(aliceAverage).to.equal(aliceScore);
    expect(afterAlice[1]).to.equal(1);

    const bobEncrypted = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add32(bobScore)
      .encrypt();

    await (await contract.connect(signers.bob).submitScore(bobEncrypted.handles[0], bobEncrypted.inputProof)).wait();

    const bobAverageData = await contract.connect(signers.bob).getEncryptedAverage();
    const bobAverage = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      bobAverageData[0],
      contractAddress,
      signers.bob,
    );
    expect(bobAverage).to.equal((aliceScore + bobScore) / 2);
    expect(bobAverageData[1]).to.equal(2);

    await (await contract.connect(signers.manager).requestTotalAccess()).wait();
    const totalData = await contract.connect(signers.manager).getEncryptedTotal();
    const clearTotal = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      totalData[0],
      contractAddress,
      signers.manager,
    );

    expect(totalData[1]).to.equal(2);
    expect(clearTotal).to.equal(aliceScore + bobScore);

    await (await contract.connect(signers.alice).requestAverageAccess()).wait();
    const refreshedAverageData = await contract.connect(signers.alice).getEncryptedAverage();
    const refreshedAverage = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      refreshedAverageData[0],
      contractAddress,
      signers.alice,
    );
    expect(refreshedAverage).to.equal((aliceScore + bobScore) / 2);
  });

  it("updates submissions and keeps participant count stable", async function () {
    await fhevm.initializeCLIApi();

    const initialScoreBob = 55;
    const updatedScoreBob = 72;

    const aliceScore = 90;

    const encrypt = async (score: number, signer: HardhatEthersSigner) =>
      fhevm.createEncryptedInput(contractAddress, signer.address).add32(score).encrypt();

    const aliceEnc = await encrypt(aliceScore, signers.alice);
    await (await contract.connect(signers.alice).submitScore(aliceEnc.handles[0], aliceEnc.inputProof)).wait();

    const bobFirst = await encrypt(initialScoreBob, signers.bob);
    await (await contract.connect(signers.bob).submitScore(bobFirst.handles[0], bobFirst.inputProof)).wait();

    const countAfterInitial = await contract.participantCount();
    expect(countAfterInitial).to.equal(2);

    const managerTotalFirst = await contract.connect(signers.manager).getEncryptedTotal();
    const clearTotalFirst = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      managerTotalFirst[0],
      contractAddress,
      signers.manager,
    );
    expect(clearTotalFirst).to.equal(aliceScore + initialScoreBob);

    const bobUpdated = await encrypt(updatedScoreBob, signers.bob);
    await (await contract.connect(signers.bob).submitScore(bobUpdated.handles[0], bobUpdated.inputProof)).wait();

    const countAfterUpdate = await contract.participantCount();
    expect(countAfterUpdate).to.equal(2);

    await (await contract.connect(signers.manager).requestTotalAccess()).wait();
    const managerTotalFinal = await contract.connect(signers.manager).getEncryptedTotal();
    const clearTotalFinal = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      managerTotalFinal[0],
      contractAddress,
      signers.manager,
    );
    expect(clearTotalFinal).to.equal(aliceScore + updatedScoreBob);

    await (await contract.connect(signers.bob).requestAverageAccess()).wait();
    const averageData = await contract.connect(signers.bob).getEncryptedAverage();
    const clearAverage = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      averageData[0],
      contractAddress,
      signers.bob,
    );
    expect(clearAverage).to.equal((aliceScore + updatedScoreBob) / 2);
  });
});

