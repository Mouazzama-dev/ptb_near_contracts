import * as nearAPI from "near-api-js";
const { connect, KeyPair, keyStores } = nearAPI;

// Configuration for NEAR connection
const config = {
  networkId: "testnet",
  keyStore: new keyStores.InMemoryKeyStore(),
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
};

async function main() {
  // Set up key pair (replace with your own private key for ft.ptb_push.testnet)
  const PRIVATE_KEY = "ed25519:4YKCSYGg2NGXizsyTDSaYsSRPM2mEDPmBcVLZGy5mgwtk5ZrSspfw8sQmNhXnQGf3NPFqCiLyKrL6U6jBa6NxC2m";
  const keyPair = KeyPair.fromString(PRIVATE_KEY);
  await config.keyStore.setKey("testnet", "ft.ptb_push.testnet", keyPair);

  // Connect to NEAR
  const near = await connect(config);
  const account = await near.account("ft.ptb_push.testnet");

// //   Initialize the fungible token contract
//   await account.functionCall({
//     contractId: "ft.ptb_push.testnet",
//     methodName: "init_default_meta",
//     args: {},
//   });
//   console.log("Contract initialized with default metadata.");

  // Register the account for storage
//   const accountIdToMint = "ft.ptb_push.testnet"; // Account to mint tokens to
//   await account.functionCall({
//     contractId: "ft.ptb_push.testnet",
//     methodName: "storage_deposit",
//     args: { account_id: accountIdToMint },
//     gas: "300000000000000", // Adjust gas if necessary
//     attachedDeposit: "1000000000000000000000000", // Typically 0.001 NEAR for storage
//   });
//   console.log(`${accountIdToMint} registered for storage.`);

//   // Mint tokens
//   const amount = "1000"; // Amount of tokens to mint
//   await account.functionCall({
//     contractId: "ft.ptb_push.testnet",
//     methodName: "mint",
//     args: { accountId: accountIdToMint, amount },
//   });
//   console.log(`Minted ${amount} tokens to ${accountIdToMint}`);
//   const balance = await account.functionCall({
//     contractId: "ft.ptb_push.testnet",
//     methodName: "ft_balance_of",
//     args: { accountId: accountIdToMint },
//   });
  
// //   console.log(`Balance of ${accountIdToMint}:`, balance);

const accountIdToTransfer = "push1.testnet";
const transferAmount = 22;
  // Register the receiver if they are not already registered
  let isReceiverRegistered;
  try {
    await account.viewFunction("ft.ptb_push.testnet", "storage_balance_of", {
      account_id: accountIdToTransfer,
    });
    isReceiverRegistered = true;
  } catch {
    isReceiverRegistered = false;
  }

  if (!isReceiverRegistered) {
    console.log(`${accountIdToTransfer} is not registered. Registering now...`);
    await account.functionCall({
      contractId: "ft.ptb_push.testnet",
      methodName: "storage_deposit",
      args: { account_id: accountIdToTransfer },
      attachedDeposit: "1000000000000000000000000", // 0.001 NEAR for storage
    });
    console.log(`${accountIdToTransfer} registered for storage.`);
  }

  // Transfer tokens
  console.log(`Transferring ${transferAmount} tokens to ${accountIdToTransfer}...`);
  await account.functionCall({
    contractId: "ft.ptb_push.testnet",
    methodName: "ft_transfer",
    args: {
      receiver_id: accountIdToTransfer,
      amount: transferAmount,
      memo: "Test transfer",
    },
    attachedDeposit: "1", // 1 yoctoNEAR required for security with NEP-141
  });
  console.log(`Transferred ${transferAmount} tokens to ${accountIdToTransfer}.`);


  
}



main()
  .then(() => console.log("Script finished"))
  .catch((err) => console.error(err));
