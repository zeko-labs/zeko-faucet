import {
  Bool,
  Sign,
  Mina,
  AccountUpdate,
  PublicKey,
  UInt64,
  Int64,
  PrivateKey,
  fetchAccount,
} from 'o1js';

if (!process.env.ZEKO_FAUCET_SENDER_PRIVATE_KEY) {
  throw new Error("set ZEKO_FAUCET_SENDER_PRIVATE_KEY env var");
}
const privateKey = PrivateKey.fromBase58(process.env.ZEKO_FAUCET_SENDER_PRIVATE_KEY);
const publicKey = privateKey.toPublicKey();
const network = Mina.Network(
  'https://devnet.zeko.io/graphql'
);
Mina.setActiveInstance(network);

if (!process.env.ZEKO_FAUCET_SEND_AMOUNT) {
  throw new Error("set ZEKO_FAUCET_SEND_AMOUNT");
}
const amount_bigint = BigInt(process.env.ZEKO_FAUCET_SEND_AMOUNT);

export async function sendPayment(address: string) {
  const faucetAccount = await fetchAccount({ publicKey: publicKey });

  const nonce = Number(faucetAccount.account?.nonce || 0);

  const feePayer = {
    sender: publicKey,
    fee: 1,
    nonce: nonce,
  };

  const amount = new UInt64(amount_bigint);

  const tx = await Mina.transaction(feePayer, async () => {
    const sender = AccountUpdate.create(publicKey);
    const receiver = AccountUpdate.create(PublicKey.fromBase58(address));
    sender.balanceChange = new Int64(amount, Sign.minusOne);
    sender.body.useFullCommitment = new Bool(true);
    sender.requireSignature();
    receiver.balanceChange = new Int64(amount, Sign.one);
    receiver.body.implicitAccountCreationFee = new Bool(true);
    receiver.body.preconditions.account.balance.isSome = new Bool(true);
    receiver.body.preconditions.account.balance.value.lower = UInt64.zero;
    receiver.body.preconditions.account.balance.value.upper = amount.sub(1);
  });

  await tx.sign([privateKey]).send();
}
