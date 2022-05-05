import { Contract } from "ethers";

import { NameRegister } from "../types/NameRegister";

const hre = require("hardhat");

export const deployContract = async <ContractType extends Contract>(
  contractName: string,
  args: any[],
  libraries?: {}
) => {
  const signers = await hre.ethers.getSigners();
  const contract = (await (
    await hre.ethers.getContractFactory(contractName, signers[0], {
      libraries: {
        ...libraries,
      },
    })
  ).deploy(...args)) as ContractType;

  return contract;
};

export const deployNameRegister = async (durationFactor: any, reserveDuration: any) => {
  return await deployContract<NameRegister>("NameRegister", [durationFactor, reserveDuration]);
};
