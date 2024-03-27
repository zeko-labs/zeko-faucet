import Client, { NetworkId } from "mina-signer";
import fetchGraphQL, {
  getAccountNonceDoc,
  sendPaymentDoc,
} from "./utils/graphql";

const client = new Client({
  network: (process.env.ZEKO_FAUCET_NETWORK || "testnet") as NetworkId,
});
const keypair = {
  publicKey: process.env.ZEKO_FAUCET_SENDER_PUBLIC_KEY!,
  privateKey: process.env.ZEKO_FAUCET_SENDER_PRIVATE_KEY!,
};

export async function sendPayment(address: string) {
  const accountNonceResponse = await fetchGraphQL(
    getAccountNonceDoc,
    "GetAccountNonce",
    { publicKey: keypair.publicKey }
  );

  if (
    accountNonceResponse.errors ||
    !accountNonceResponse.data?.account?.nonce
  ) {
    throw new Error("Fetching account nonce failed");
  }

  const signedPayment = client.signPayment(
    {
      to: address,
      from: keypair.publicKey,
      amount: Number(process.env.ZEKO_FAUCET_SEND_AMOUNT || 10),
      fee: 1,
      nonce: accountNonceResponse.data.account.nonce,
    },
    keypair.privateKey
  );

  if (!client.verifyPayment(signedPayment)) {
    throw new Error("Payment is not verified");
  }

  console.log("Payment was verified successfully", signedPayment);
  const sendPaymentResponse = await fetchGraphQL(
    sendPaymentDoc,
    "SendPayment",
    {
      input: signedPayment.data,
      signature: signedPayment.signature,
    }
  );

  if (sendPaymentResponse.errors) {
    throw new Error(JSON.stringify(sendPaymentResponse.er));
  }

  console.log(sendPaymentResponse.data);
}
