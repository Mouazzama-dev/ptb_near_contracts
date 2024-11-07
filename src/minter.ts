import { NearBindgen, near, call, view, initialize, NearPromise, str } from 'near-sdk-js';
import { Nullable, OwnerArgs, StorageBalance, StorageBalanceBounds, StorageDepositArgs } from "./common/types";
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
    near.log("Starting calculateAndMint function...");
  
    // Read emissions account data
    const emissionsAccountData = near.storageRead(Minter.EMISSIONS_ACCOUNT_KEY);
    if (!emissionsAccountData) {
      throw new Error("Emissions account not initialized.");
    }
    near.log("Emissions account data successfully retrieved.");
    const emissionsAccount = JSON.parse(emissionsAccountData);
  
    // Read loot raffle pool data
    const lootRaffleData = near.storageRead(Minter.LOOT_RAFFLE_POOL_KEY);
    if (!lootRaffleData) {
      throw new Error("Loot Raffle account not initialized.");
    }
    near.log("Loot Raffle pool account data successfully retrieved.");
    const lootRafflePoolAccount = JSON.parse(lootRaffleData);
  
    // Read global tapping pool data
    const GlobalTappingData = near.storageRead(Minter.GLOBAL_TAPPING_POOL_KEY);
    if (!GlobalTappingData) {
      throw new Error("Global Tapping account not initialized.");
    }
    near.log("Global Tapping pool data successfully retrieved.");
    const globalTappingPool = JSON.parse(GlobalTappingData);
  
    // Get current timestamp
    const currentTimestamp = near.blockTimestamp();
    near.log(`Current timestamp: ${currentTimestamp}`);
  
    // Define the duration of a month (30 days in milliseconds)
    const SECONDS_IN_A_MONTH = Minter.MONTH_DURATION;
    near.log(`Month duration set to: ${SECONDS_IN_A_MONTH} seconds`);
  
    // Check if it's not the first month
    if (emissionsAccount.currentMonth > 0) {
      near.log(`Current month: ${emissionsAccount.currentMonth}. Not the first month, checking time since last update...`);
      
      // Ensure enough time has passed since the last update
      if (currentTimestamp < emissionsAccount.lastMintTimestamp + SECONDS_IN_A_MONTH) {
        throw new Error("Month duration has not yet elapsed");
      }
      near.log("Month duration has elapsed, continuing with minting process...");
  
      // Apply decay factor to emissions
      emissionsAccount.currentEmissions = Math.floor(emissionsAccount.currentEmissions * emissionsAccount.decayFactor);
      near.log(`Emissions after decay: ${emissionsAccount.currentEmissions}`);
    } else {
      near.log("First month detected, skipping decay adjustment.");
    }
    near.log(`Emissions Account Data: ${JSON.stringify(emissionsAccount.currentEmissions)}`);
    // Convert necessary fields to the correct types
    emissionsAccount.current_emissions = Number(emissionsAccount.currentEmissions);
    emissionsAccount.current_month = Number(emissionsAccount.currentMonth); // or BigInt if needed
    emissionsAccount.decayFactor = Number(emissionsAccount.decayFactor); // Convert decay factor to a number
  
    // Calculate the amount to mint based on current emissions for this month
    const amount = emissionsAccount.currentEmissions;
    near.log(`Minting amount for this month: ${amount}`);
    near.log(`Minting for month: ${emissionsAccount.current_month}`);
  
    // Minting logic
    near.log("Proceeding with minting logic...");
    this.internal_deposit({ account_id: "test.near", amount: amount });
    near.log(`Minted amount: ${amount} to account: test.near`);
  
    // Increase the total supply
    this.total_supply += amount;
    near.log(`Total supply after minting: ${this.total_supply}`);
  
    // Emit the mint event
    FTMintEvent.emit({ accountId: Minter.OWNER_KEY, amount: amount, memo: "Minter Contract" });
    near.log("Mint event emitted successfully.");
  
    // Reset tapping pool amount to a fixed monthly value
    globalTappingPool.amount = 1_000_000_000_00000;
    near.log("Global tapping pool reset to monthly fixed value: 1,000,000,000,00000");
  
    // Adjust raffle pool amount based on decay and update total
    if (emissionsAccount.current_month > 0) {
      lootRafflePoolAccount.amount = Math.floor(lootRafflePoolAccount.amount * emissionsAccount.decayFactor);
      near.log(`Raffle pool amount after decay: ${lootRafflePoolAccount.amount}`);
    }
    lootRafflePoolAccount.totalAmount += lootRafflePoolAccount.amount;
    near.log(`Updated raffle pool total amount: ${lootRafflePoolAccount.totalAmount}`);
  
    // Update last mint timestamp and increment the month count
    emissionsAccount.lastMintTimestamp = currentTimestamp;
    emissionsAccount.current_month += 1;
    near.log(`Updated last mint timestamp to: ${currentTimestamp}`);
    near.log(`Incremented current month to: ${emissionsAccount.currentMonth}`);

    // Convert BigInt values to string before saving to storage
    const emissionsAccountToSave = {
        ...emissionsAccount,
        current_emissions: emissionsAccount.current_emissions.toString(),  // Convert BigInt to string
        lastMintTimestamp: emissionsAccount.lastMintTimestamp.toString(),  // Convert BigInt to string if needed
    };

  
    // Save the updated accounts back to storage
    near.storageWrite(Minter.EMISSIONS_ACCOUNT_KEY, JSON.stringify(emissionsAccountToSave));
    near.log("Emissions account data saved back to storage.");
    near.storageWrite(Minter.LOOT_RAFFLE_POOL_KEY, JSON.stringify(lootRafflePoolAccount));
    near.log("Loot raffle pool account data saved back to storage.");
    near.storageWrite(Minter.GLOBAL_TAPPING_POOL_KEY, JSON.stringify(globalTappingPool));
    near.log("Global tapping pool data saved back to storage.");
  
    near.log("calculateAndMint function completed successfully.");
    return "Minting calculation completed successfully.";
  }
    //@ts-ignore
  @call({ payableFunction: true })
  storage_deposit({
    account_id,
    registration_only,
  }: StorageDepositArgs): Nullable<StorageBalance> {
    // Get the amount of $NEAR to deposit
    const amount = near.attachedDeposit();
    // If an account was specified, use that. Otherwise, use the predecessor account.
    let accountId = account_id ?? near.predecessorAccountId();

    // If the account is already registered, refund the deposit.
    if (this.accounts.containsKey(accountId)) {
      near.log("The account is already registered, refunding the deposit.");
      if (amount > BigInt(0)) {
        NearPromise.new(accountId).transfer(amount);
      }
    } else {
      // Register the account and refund any excess $NEAR
      // Get the minimum required storage and ensure the deposit is at least that amount
      const min_balance = this.storage_balance_bounds().min;

      if (amount < min_balance) {
        throw new Error(
          "The attached deposit is less than the minimum storage balance"
        );
      }

      // Register the account
      this.internal_register_account({ account_id: accountId });

      // Perform a refund
      const refund = amount - min_balance;
      if (refund > BigInt(0)) {
        NearPromise.new(accountId).transfer(refund);
      }
    }
    near.log(this.storage_balance_bounds().min)

    // Return the storage balance of the account
    return {
      total: this.storage_balance_bounds().min,
      available: BigInt(0),
    };
  }

  //@ts-ignore
  @view({})
  storage_balance_bounds(): StorageBalanceBounds {
    near.log("line 170 ")
    // Calculate the required storage balance by taking the bytes for the longest account ID and multiplying by the current byte cost
    let requiredStorageBalance =
      this.bytes_for_longest_account_id * near.storageByteCost();

    // Storage balance bounds will have min == max == requiredStorageBalance
    return {
      min: requiredStorageBalance,
      max: requiredStorageBalance,
    };
  }

}
