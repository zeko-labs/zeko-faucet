import Client, { NetworkId } from "mina-signer";
import executeMutation, { sendPaymentDoc } from "./utils/graphql";

const client = new Client({
  network: "testnet",
});
const keypair = {
  publicKey: process.env.ZEKO_FAUCET_SENDER_PUBLIC_KEY!,
  privateKey: process.env.ZEKO_FAUCET_SENDER_PRIVATE_KEY!,
};

export async function sendPayment(address: string) {
  const signedPayment = client.signPayment(
    {
      to: address,
      from: keypair.publicKey,
      amount: Number(process.env.ZEKO_FAUCET_SEND_AMOUNT || 10),
      fee: 1,
      nonce: 0,
    },
    keypair.privateKey
  );

  if (!client.verifyPayment(signedPayment)) {
    throw new Error("Payment is not verified");
  }

  console.log("Payment was verified successfully", signedPayment);
  const { data, signature } = signedPayment;
  return await executeMutation(sendPaymentDoc(data, signature));
}
