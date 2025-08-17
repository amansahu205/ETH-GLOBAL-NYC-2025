import { ethers } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts to Zircuit testnet...");
  console.log("Deployer address:", deployer.address);

  // Deploy MockSmartAccount first
  const MockSmartAccount = await ethers.getContractFactory("MockSmartAccount");
  const mockSmartAccount = await MockSmartAccount.deploy(deployer.address);
  await mockSmartAccount.waitForDeployment();
  const smartAccountAddress = await mockSmartAccount.getAddress();

  console.log("MockSmartAccount deployed to:", smartAccountAddress);

  // Deploy GuardianController with MockSmartAccount address
  const GuardianController = await ethers.getContractFactory("GuardianController");
  const guardianController = await GuardianController.deploy(smartAccountAddress);
  await guardianController.waitForDeployment();

  // Deploy ApprovalRevokeHelper
  const ApprovalRevokeHelper = await ethers.getContractFactory("ApprovalRevokeHelper");
  const approvalRevokeHelper = await ApprovalRevokeHelper.deploy();
  await approvalRevokeHelper.waitForDeployment();

  const guardianControllerAddress = await guardianController.getAddress();
  const approvalRevokeHelperAddress = await approvalRevokeHelper.getAddress();

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("MockSmartAccount deployed to:", smartAccountAddress);
  console.log("GuardianController deployed to:", guardianControllerAddress);
  console.log("ApprovalRevokeHelper deployed to:", approvalRevokeHelperAddress);
  console.log("\nUpdate your backend .env file with these addresses:");
  console.log(`SMART_ACCOUNT_ADDR=${smartAccountAddress}`);
  console.log(`GUARDIAN_CONTROLLER_ADDR=${guardianControllerAddress}`);
  console.log(`APPROVAL_REVOKE_HELPER_ADDR=${approvalRevokeHelperAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});