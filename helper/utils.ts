import hre from "hardhat";
import { ethers } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";

export const ether = (amount: number | string): BigNumber => {
  const weiString = ethers.utils.parseEther(amount.toString());
  return BigNumber.from(weiString);
};

export const wei = (amount: number | string): BigNumber => {
  const weiString = ethers.utils.parseUnits(amount.toString(), 0);
  return BigNumber.from(weiString);
};

export const gWei = (amount: number): BigNumber => {
  const weiString = BigNumber.from("1000000000").mul(amount);
  return BigNumber.from(weiString);
};

export const usdc = (amount: number): BigNumber => {
  const weiString = BigNumber.from("1000000").mul(amount);
  return BigNumber.from(weiString);
};

export const increaseTime = async (sec: number) => {
  await hre.network.provider.send("evm_increaseTime", [sec]);
  await hre.network.provider.send("evm_mine");
};

export const getTimeStamp = async () => {
  const blockNumber = await hre.network.provider.send("eth_blockNumber");
  const blockTimestamp = (
    await hre.network.provider.send("eth_getBlockByNumber", [
      blockNumber,
      false,
    ])
  ).timestamp;
  return parseInt(blockTimestamp.slice(2), 16);
};