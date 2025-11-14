import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHEPacMan = await deploy("FHEPacMan", {
    from: deployer,
    log: true,
  });

  console.log(`FHEPacMan contract: `, deployedFHEPacMan.address);
};
export default func;
func.id = "deploy_FHEPacMan"; // id required to prevent reexecution
func.tags = ["FHEPacMan"];
