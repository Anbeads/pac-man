import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { FHEPacMan, FHEPacMan__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEPacMan")) as FHEPacMan__factory;
  const pacManContract = (await factory.deploy()) as FHEPacMan;
  const pacManAddress = await pacManContract.getAddress();

  return { pacManContract, pacManAddress };
}

describe("Encrypted Pac-Man Score Management", function () {
  let signers: Signers;
  let pacManContract: FHEPacMan;
  let pacManAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("Skipping tests: FHE mock environment required");
      this.skip();
    }

    ({ pacManContract, pacManAddress } = await deployFixture());
  });

  it("should fail if querying score before any play", async function () {
    await expect(pacManContract.viewTopScore(signers.alice.address)).to.be.revertedWith(
      "No Pac-Man score found for this player",
    );
  });

  it("records a new score for a first-time player", async function () {
    const score = 42;

    const encrypted = await fhevm.createEncryptedInput(pacManAddress, signers.alice.address).add32(score).encrypt();

    await pacManContract.connect(signers.alice).recordScore(encrypted.handles[0], encrypted.inputProof);

    const encryptedStored = await pacManContract.viewTopScore(signers.alice.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, encryptedStored, pacManAddress, signers.alice);

    expect(decrypted).to.eq(score);
  });

  it("updates the top score only when a higher value is submitted", async function () {
    const initialScore = 15;
    const betterScore = 88;

    const encInitial = await fhevm
      .createEncryptedInput(pacManAddress, signers.alice.address)
      .add32(initialScore)
      .encrypt();
    await pacManContract.connect(signers.alice).recordScore(encInitial.handles[0], encInitial.inputProof);

    const encBetter = await fhevm
      .createEncryptedInput(pacManAddress, signers.alice.address)
      .add32(betterScore)
      .encrypt();
    await pacManContract.connect(signers.alice).recordScore(encBetter.handles[0], encBetter.inputProof);

    const storedEncrypted = await pacManContract.viewTopScore(signers.alice.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, storedEncrypted, pacManAddress, signers.alice);

    expect(decrypted).to.eq(betterScore);
  });

  it("ignores new score if it is lower than existing top score", async function () {
    const highScore = 77;
    const lowScore = 22;

    const encHigh = await fhevm.createEncryptedInput(pacManAddress, signers.alice.address).add32(highScore).encrypt();
    await pacManContract.connect(signers.alice).recordScore(encHigh.handles[0], encHigh.inputProof);

    const encLow = await fhevm.createEncryptedInput(pacManAddress, signers.alice.address).add32(lowScore).encrypt();
    await pacManContract.connect(signers.alice).recordScore(encLow.handles[0], encLow.inputProof);

    const storedEncrypted = await pacManContract.viewTopScore(signers.alice.address);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint32, storedEncrypted, pacManAddress, signers.alice);

    expect(decrypted).to.eq(highScore);
  });

  it("ensures separate players maintain independent scores", async function () {
    const aliceScore = 55;
    const bobScore = 99;

    const encAlice = await fhevm.createEncryptedInput(pacManAddress, signers.alice.address).add32(aliceScore).encrypt();
    const encBob = await fhevm.createEncryptedInput(pacManAddress, signers.bob.address).add32(bobScore).encrypt();

    await pacManContract.connect(signers.alice).recordScore(encAlice.handles[0], encAlice.inputProof);
    await pacManContract.connect(signers.bob).recordScore(encBob.handles[0], encBob.inputProof);

    const aliceEncrypted = await pacManContract.viewTopScore(signers.alice.address);
    const bobEncrypted = await pacManContract.viewTopScore(signers.bob.address);

    const aliceDecrypted = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      aliceEncrypted,
      pacManAddress,
      signers.alice,
    );
    const bobDecrypted = await fhevm.userDecryptEuint(FhevmType.euint32, bobEncrypted, pacManAddress, signers.bob);

    expect(aliceDecrypted).to.eq(aliceScore);
    expect(bobDecrypted).to.eq(bobScore);
  });

  it("correctly identifies if a user has submitted a score", async function () {
    const player = signers.alice;

    expect(await pacManContract.hasScore(player.address)).to.be.false;

    const encryptedScore = await fhevm.createEncryptedInput(pacManAddress, player.address).add32(66).encrypt();
    await pacManContract.connect(player).recordScore(encryptedScore.handles[0], encryptedScore.inputProof);

    expect(await pacManContract.hasScore(player.address)).to.be.true;
  });
});
