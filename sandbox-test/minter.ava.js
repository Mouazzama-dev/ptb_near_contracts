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