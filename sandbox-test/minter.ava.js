import anyTest from 'ava';
import { Worker } from 'near-workspaces';
import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

/**
 *  @typedef {import('near-workspaces').NearAccount} NearAccount
 *  @type {import('ava').TestFn<{worker: Worker, accounts: Record<string, NearAccount>}>}
 */
const test = anyTest;

test.beforeEach(async t => {
  const worker = t.context.worker = await Worker.init();
  const root = worker.rootAccount;
  const contract = await root.createSubAccount('minter-contract');
  await contract.deploy('./build/minter.wasm');
  t.context.accounts = { root, contract };
});

test.afterEach.always(async (t) => {
  await t.context.worker.tearDown().catch((error) => {
    console.log('Failed to stop the Sandbox:', error);
  });
});

// Test initialize method with owner and non-owner access
test('initialize by owner and restrict non-owner', async (t) => {
  try {
    const { root, contract } = t.context.accounts;

    // Initialize by owner, passing root as the owner
    console.log("Initialization by owner started");
    await root.call(contract, 'init', { owner: root.accountId });
    console.log("Initialization by owner completed");

    // Verify initialization worked
    const emissionsAccount = await contract.view('getEmissionsAccount', {});
    console.log("Emissions account after initialization:", emissionsAccount);
    t.truthy(emissionsAccount, 'Emissions account should be initialized');
    t.is(emissionsAccount.initialEmissions, '3000000000', 'Initial emissions should match');

    // // Test restriction for non-owner
    // const nonOwner = await root.createSubAccount('non-owner');
    // console.log("Attempting initialization by non-owner");
    // await t.throwsAsync(
    //   async () => {
    //     await nonOwner.call(contract, 'initialize', { owner: nonOwner.accountId });
    //   },
    //   { message: /Only the owner can initialize the contract/ },
    //   'Non-owner should not be able to initialize'
    // );
    // console.log("Non-owner restricted from initialization as expected");
  } catch (error) {
    console.error('Error during test:', error);
    t.fail('Test failed due to unexpected error.');
  }
});


// Test the calculateAndMint function
test('calculate and mint emissions for the new month', async (t) => {
    const { root, contract } = t.context.accounts;
  
    // Step 1: Initialize the contract with the root account as the owner
    console.log("Initializing the contract...");
    await root.call(contract, 'init', { owner_id: root.accountId });
    console.log("Contract initialized successfully.");
  
    // Step 2: Fetch the initial emissions account and store initial values
    const initialEmissionsAccount = await contract.view('getEmissionsAccount', {});
    t.truthy(initialEmissionsAccount, 'Emissions account should be initialized');
    t.is(initialEmissionsAccount.initialEmissions, '3000000000', 'Initial emissions should be set correctly');
  
    // Step 3: Simulate time passing to allow minting (mock time if needed)
    console.log("Advancing time by one month for minting eligibility...");
    // const MONTH_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    // await new Promise((resolve) => setTimeout(resolve, MONTH_DURATION + 1000)); // Add 1s buffer
  
    // Step 4: Call calculateAndMint
    console.log("Calling calculateAndMint...");
    const accountId = root.accountId;
    console.log("account id ", root.accountId)
    // get the storage balance bounds
    const storageBounds = await contract.view(
        "storage_balance_bounds",
        {}
    );
    console.log("storage Bounds" , storageBounds)
    // register the root account
    const storage = await root.call(
        contract,
        "storage_deposit",
        { account_id: accountId },
        {
        attachedDeposit: storageBounds.min.toString(),
        }
    );
    console.log(storage )
    const mintResult = await root.call(contract, 'calculateAndMint', {});
    console.log("Mint result:", mintResult);
  
    // Step 5: Fetch updated emissions account and validate changes
    const updatedEmissionsAccount = await contract.view('getEmissionsAccount', {});
    console.log("Updated Emissions Account:", updatedEmissionsAccount);
    t.truthy(updatedEmissionsAccount, 'Emissions account should still exist');
    t.notDeepEqual(updatedEmissionsAccount, initialEmissionsAccount, 'Emissions account should be updated');
    // t.true(updatedEmissionsAccount.current_emissions < initialEmissionsAccount.current_emissions, 'Emissions should decay');
    // t.is(updatedEmissionsAccount.current_month, initialEmissionsAccount.current_month + 1, 'Month count should increment');
  
    console.log("All checks passed for calculateAndMint.");
  });
  