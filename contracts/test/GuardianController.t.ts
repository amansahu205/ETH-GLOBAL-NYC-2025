import { expect } from "chai";
import { ethers } from "hardhat";
import { GuardianController, MockSmartAccount } from "../typechain-types";

describe("GuardianController", function () {
  let guardianController: GuardianController;
  let mockSmartAccount: MockSmartAccount;
  let owner: any;
  let guardian: any;
  let newSigner: any;

  beforeEach(async function () {
    [owner, guardian, newSigner] = await ethers.getSigners();

    // Deploy MockSmartAccount
    const MockSmartAccountFactory = await ethers.getContractFactory("MockSmartAccount");
    mockSmartAccount = await MockSmartAccountFactory.deploy();
    await mockSmartAccount.waitForDeployment();

    // Deploy GuardianController
    const GuardianControllerFactory = await ethers.getContractFactory("GuardianController");
    guardianController = await GuardianControllerFactory.deploy(await mockSmartAccount.getAddress());
    await guardianController.waitForDeployment();
  });

  it("Should set guardian and allow signer rotation", async function () {
    // Set guardian
    await guardianController.connect(owner).setGuardian(guardian.address, true);
    
    // Verify guardian is set
    expect(await guardianController.guardians(guardian.address)).to.be.true;

    // Rotate signer from guardian
    const tx = await guardianController.connect(guardian).rotateSigner(newSigner.address);
    
    // Check event was emitted
    await expect(tx)
      .to.emit(guardianController, "SignerRotated")
      .withArgs(newSigner.address, guardian.address);

    // Verify mock smart account received the call
    expect(await mockSmartAccount.currentSigner()).to.equal(newSigner.address);
  });

  it("Should allow owner to rotate signer", async function () {
    // Owner should be able to rotate without being a guardian
    const tx = await guardianController.connect(owner).rotateSigner(newSigner.address);
    
    await expect(tx)
      .to.emit(guardianController, "SignerRotated")
      .withArgs(newSigner.address, owner.address);

    expect(await mockSmartAccount.currentSigner()).to.equal(newSigner.address);
  });

  it("Should reject rotation from non-guardian", async function () {
    // Should fail from non-guardian, non-owner
    await expect(
      guardianController.connect(newSigner).rotateSigner(guardian.address)
    ).to.be.revertedWith("Not authorized");
  });

  it("Should reject zero address as new signer", async function () {
    await expect(
      guardianController.connect(owner).rotateSigner(ethers.ZeroAddress)
    ).to.be.revertedWith("Invalid signer address");
  });
});

// Mock Smart Account Contract for testing
contract MockSmartAccount {
  address public currentSigner;
  
  function setSigner(address newSigner) external {
    currentSigner = newSigner;
  }
}