import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OnchainVault } from "../target/types/onchain_vault";
import { beforeAll, describe, it, expect } from "vitest";
import {
createMint,
createAccount,
mintTo,
getAccount,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

describe("onchain_vault", () => {
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const wallet = provider.wallet as anchor.Wallet;

const program = anchor.workspace.OnchainVault as Program<OnchainVault>;

let mint: PublicKey;
let escrow: PublicKey;
let vaultPda: PublicKey;
let vaultBump: number;

beforeAll(async () => {
//
// 1️⃣ Create mint
//
mint = await createMint(
provider.connection,
wallet.payer,
wallet.publicKey,
null,
9
);

//
// 2️⃣ Create escrow token account owned by user
//
escrow = await createAccount(
  provider.connection,
  wallet.payer,
  mint,
  wallet.publicKey
);

console.log("Escrow Account:", escrow.toBase58());
console.log("Mint Address:", mint.toBase58());

//
// 3️⃣ Derive vault PDA
//
[vaultPda, vaultBump] =
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      wallet.publicKey.toBuffer(),
      mint.toBuffer(),
    ],
    program.programId
  );


});

it("Initialize Vault", async () => {
const ix = await program.methods
.initializeVault()
.accounts({
authority: wallet.publicKey,
mint,
escrow,
})
.instruction();


const bh = await provider.connection.getLatestBlockhash();

const tx = new anchor.web3.Transaction({
  feePayer: wallet.publicKey,
  blockhash: bh.blockhash,
  lastValidBlockHeight: bh.lastValidBlockHeight,
}).add(ix);

const sig = await anchor.web3.sendAndConfirmTransaction(
  provider.connection,
  tx,
  [wallet.payer]
);

console.log("Initialized Vault:", sig);

//
// Fetch Vault PDA and confirm values
//
const vaultAccount = await program.account.vault.fetch(vaultPda);

expect(vaultAccount.authority.toBase58()).toEqual(
  wallet.publicKey.toBase58()
);

expect(vaultAccount.mint.toBase58()).toEqual(mint.toBase58());
expect(vaultAccount.escrow.toBase58()).toEqual(escrow.toBase58());


});

  it("Deposit tokens", async () => {
    //
    // 1️⃣ Create user wallet token account
    //
    const userTokenAccountKeypair = anchor.web3.Keypair.generate();
    
    const userTokenAccount = await createAccount(
      provider.connection,
      wallet.payer,
      mint,
      wallet.publicKey,
      userTokenAccountKeypair
    );
//
// 2️⃣ Mint some tokens to user account
//
await mintTo(
  provider.connection,
  wallet.payer,
  mint,
  userTokenAccount,
  wallet.publicKey,
  1000
);

//
// Derive UserDeposit PDA
//
const [userDepositPda] =
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_deposit"),
      wallet.publicKey.toBuffer(),
      vaultPda.toBuffer(),
    ],
    program.programId
  );

//
// 3️⃣ Make deposit instruction
//
    const ix = await program.methods
      .deposit(new anchor.BN(1000))
      .accounts({
        user: wallet.publicKey,
        mint,
        escrow,
        userTokenAccount,
      })
      .instruction();const bh = await provider.connection.getLatestBlockhash();

const tx = new anchor.web3.Transaction({
  feePayer: wallet.publicKey,
  blockhash: bh.blockhash,
  lastValidBlockHeight: bh.lastValidBlockHeight,
}).add(ix);

const sig = await anchor.web3.sendAndConfirmTransaction(
  provider.connection,
  tx,
  [wallet.payer]
);

console.log("Deposit Signature:", sig);

//
// 4️⃣ Read UserDeposit
//
const userDepositAcct =
  await program.account.userDeposit.fetch(userDepositPda);

expect(Number(userDepositAcct.amount)).toEqual(1000);

//
// 5️⃣ Check escrow balance increased
//
const escrowAccountData = await getAccount(
  provider.connection,
  escrow
);

expect(Number(escrowAccountData.amount)).toEqual(1000);


});
});
