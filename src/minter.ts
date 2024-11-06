import { NearBindgen, near, call, view, initialize } from 'near-sdk-js';
import { OwnerArgs } from "./common/types";
import ContractLibrary from "./lib";
import {FTMintEvent} from "./common/models";


@NearBindgen({})
class Minter extends ContractLibrary{
  static OWNER_KEY = 'owner';
  static MONTH_DURATION = 30 * 24 * 60 * 60 * 1000;

  static EMISSIONS_ACCOUNT_KEY = 'emissionsAccount';
  static LOOT_RAFFLE_POOL_KEY = 'lootRafflePool';
  static GLOBAL_TAPPING_POOL_KEY = 'globalTappingPool';

  // Initialize emission and pool accounts and set owner
  // @ts-ignore
  @initialize({})
  init({ owner_id = Minter.OWNER_KEY }: OwnerArgs) {
    if (near.storageRead(Minter.OWNER_KEY)) {
      throw new Error("Contract is already initialized");
    }

    near.storageWrite(Minter.OWNER_KEY, owner_id);
    near.storageWrite(Minter.EMISSIONS_ACCOUNT_KEY, JSON.stringify({
      initialEmissions: '3000000000',
      decayFactor: 0.8705505633,
      currentMonth: 0,
      currentEmissions: '3000000000',
      lastMintTimestamp: Date.now(),
    }));
    near.storageWrite(Minter.LOOT_RAFFLE_POOL_KEY, JSON.stringify({
      poolId: 1,
      amount: '50000000000000',
      totalAmount: '0',
    }));
    near.storageWrite(Minter.GLOBAL_TAPPING_POOL_KEY, JSON.stringify({
      poolId: 2,
      amount: '100000000000000',
    }));
  }

  // View function to get the emissions account
  //@ts-ignore
  @view({})
  getEmissionsAccount() {
    const emissionsAccount = near.storageRead(Minter.EMISSIONS_ACCOUNT_KEY);
    return emissionsAccount ? JSON.parse(emissionsAccount) : null;
  }

  // Calculate emissions and mint tokens
  //@ts-ignore
  @call({})
  calculateAndMint() {
    const emissionsAccountData = near.storageRead(Minter.EMISSIONS_ACCOUNT_KEY);
    if (!emissionsAccountData) {
      throw new Error("Emissions account not initialized.");
    }
    const emissionsAccount = JSON.parse(emissionsAccountData);

    const lootRaffleData = near.storageRead(Minter.LOOT_RAFFLE_POOL_KEY);
    if (!lootRaffleData) {
      throw new Error("Loot Raffle account not initialized.");
    }
    const lootRafflePoolAccount = JSON.parse(lootRaffleData);

    const GlobalTappingData = near.storageRead(Minter.GLOBAL_TAPPING_POOL_KEY);
    if (!GlobalTappingData) {
      throw new Error("Loot Raffle account not initialized.");
    }
    const globalTappingPool = JSON.parse(GlobalTappingData);
    
    const currentTimestamp = Date.now();

    // Define the duration of a month (30 days in milliseconds)
    const SECONDS_IN_A_MONTH = Minter.MONTH_DURATION;

    // Check if it’s not the first month
    if (emissionsAccount.current_month > 0) {
      // Ensure enough time has passed since the last update
      if (currentTimestamp < emissionsAccount.lastMintTimestamp + SECONDS_IN_A_MONTH) {
        throw new Error("Month duration has not yet elapsed");
      }

      // Reduce emissions based on decay factor
      emissionsAccount.current_emissions = Math.floor(emissionsAccount.current_emissions * emissionsAccount.decayFactor);
    }
    
    // Calculate the amount to mint based on current emissions for this month
    const amount = BigInt(emissionsAccount.current_emissions * 100_000);  // Adjust for decimals if needed

    // Minting logic 
    // Mint the tokens
    this.internal_deposit({ account_id : Minter.OWNER_KEY, amount: amount });
    
    // increase the total supply
    this.total_supply += BigInt(amount);
    
    // Emit the mint event
    FTMintEvent.emit({ accountId: Minter.OWNER_KEY, amount: amount, memo: "Minter Contract" });

    // Reset tapping pool amount to a fixed monthly value
    globalTappingPool.amount = 1_000_000_000_00000;

    // Adjust raffle pool amount based on decay and update total
    if (emissionsAccount.current_month > 0) {
      lootRafflePoolAccount.amount = Math.floor(lootRafflePoolAccount.amount * emissionsAccount.decayFactor);
    }
    lootRafflePoolAccount.total_amount += lootRafflePoolAccount.amount;

    // Update last mint timestamp and increment the month count
    emissionsAccount.lastMintTimestamp = currentTimestamp;
    emissionsAccount.current_month += 1;

    // Save the updated accounts back to storage
    near.storageWrite(Minter.EMISSIONS_ACCOUNT_KEY, JSON.stringify(emissionsAccount));
    near.storageWrite(Minter.LOOT_RAFFLE_POOL_KEY, JSON.stringify(lootRafflePoolAccount));
    near.storageWrite(Minter.GLOBAL_TAPPING_POOL_KEY, JSON.stringify(globalTappingPool));

    return "Minting calculation completed successfully.";
  }
}
