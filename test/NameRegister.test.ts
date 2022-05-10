import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { solidityKeccak256 } from 'ethers/lib/utils';

import { deployNameRegister } from '../helper/contract';
import { NameRegister } from '../types';
import { ether, getTimeStamp, gWei, increaseTime } from '../helper/utils';

describe('NameRegister', () => {
  let nameRegister: NameRegister;

  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  const lengthMultiplier = ether(1);
  const lengthFactor = ether(1).div(100);
  const durationFactor = gWei(1); // 1s = lock 1 gwei
  const reserveDuration = 60; // reserve valid duration = 60s
  const name = 'AAA';
  const hash = solidityKeccak256(['string'], [name]);

  let duration = 0;

  before(async () => {
    const signers: SignerWithAddress[] = await ethers.getSigners();

    alice = signers[1];
    bob = signers[2];

    nameRegister = await deployNameRegister(durationFactor, reserveDuration);
  });

  describe('ReserveName by alice', async () => {
    it('alice reserve name', async () => {
      await nameRegister.connect(alice).reserveName(hash);

      const reserveExpiresAt = (await getTimeStamp()) + reserveDuration;
      const info = await nameRegister.infos(hash);

      expect(info.owner).to.equal(alice.address);
      expect(info.reserveExpiresAt).to.equal(reserveExpiresAt);
      expect(info.lockedAmount).to.equal('0');
      expect(info.registrationExpiresAt).to.equal('0');
    });
  });

  describe('ReserveName by bob', async () => {
    it("bob can't reserve alice's name", async () => {
      await expect(
        nameRegister.connect(bob).reserveName(hash)
      ).to.be.revertedWith('Name already reserved');
    });
  });

  describe('RegisterName by alice', async () => {
    it('alice register name', async () => {
      const value = ether(1);
      await nameRegister.connect(alice).registerName(name, {
        value: value.toString(),
      });

      const timestamp = await getTimeStamp();
      const fee = value
        .mul(name.length)
        .mul(lengthFactor)
        .div(lengthMultiplier);
      const lockedAmount = value.sub(fee);
      duration = lockedAmount.div(durationFactor).toNumber();

      const info = await nameRegister.infos(hash);
      expect(info.owner).to.equal(alice.address);
      expect(info.lockedAmount).to.equal(lockedAmount);
      expect(info.registrationExpiresAt).to.equal(timestamp + duration);
    });

    it('alice reserve name before expired', async () => {
      await expect(
        nameRegister.connect(alice).reserveName(hash)
      ).to.be.revertedWith('Name already registered');
    });

    it("alice can't withdraw", async () => {
      await expect(
        nameRegister.connect(alice).withdrawExpiredName(name)
      ).to.be.revertedWith('Name registration not expired');
    });
  });

  describe('RegisterName by bob', async () => {
    it("bob can't register an unreserved name", async () => {
      await expect(
        nameRegister.connect(bob).registerName('AAAAAAA')
      ).to.be.revertedWith('Incorrect owner');
    });

    it("bob can't reserve alice's name", async () => {
      await expect(
        nameRegister.connect(bob).reserveName(hash)
      ).to.be.revertedWith('Name already registered');
    });
  });

  describe('RenewName', async () => {
    it('alice renew the name', async () => {
      const value = ether(1);
      await nameRegister.connect(alice).renewName(name, {
        value: value.toString(),
      });

      const timestamp = await getTimeStamp();
      const fee = value
        .mul(name.length)
        .mul(lengthFactor)
        .div(lengthMultiplier);
      const lockedValue = value.sub(fee);
      duration = lockedValue.div(durationFactor).toNumber();

      const info = await nameRegister.infos(hash);
      expect(info.owner).to.equal(alice.address);
      expect(info.lockedAmount).to.equal(lockedValue);
      expect(info.registrationExpiresAt).to.equal(timestamp + duration);
    });

    it('bob renew the name', async () => {
      const value = ether(1);
      await expect(
        nameRegister.connect(bob).renewName(name, {
          value: value.toString(),
        })
      ).to.be.revertedWith('Not owner');
    });
  });

  describe('Expired Name', async () => {
    before(async () => {
      await increaseTime(duration);
    });

    it("alice can't renew", async () => {
      const value = ether(1);
      await expect(
        nameRegister.connect(alice).renewName(name, { value: value.toString() })
      ).to.be.revertedWith('Name registration expired');
    });

    it('alice can withdraw', async () => {
      const oldBalance = await alice.getBalance();

      await nameRegister.connect(alice).withdrawExpiredName(name);

      const newBalance = await alice.getBalance();
      expect(newBalance.gt(oldBalance)).to.equal(true);

      const info = await nameRegister.infos(hash);
      expect(info.lockedAmount).to.equal('0');
    });

    it('bob can reserve', async () => {
      await nameRegister.connect(bob).reserveName(hash);

      const reserveExpiresAt = (await getTimeStamp()) + reserveDuration;
      const info = await nameRegister.infos(hash);

      expect(info.owner).to.equal(bob.address);
      expect(info.reserveExpiresAt).to.equal(reserveExpiresAt);
      expect(info.lockedAmount).to.equal('0');
    });
  });
});
