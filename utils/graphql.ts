import fetch from "node-fetch";

export default async function fetchGraphQL(
  operationsDoc: string,
  operationName: string,
  variables: Record<string, any>
) {
  const result = await fetch(process.env.ZEKO_FAUCET_GRAPHQL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: operationsDoc,
      variables: variables,
      operationName: operationName,
    }),
  });

  return await result.json();
}

export const sendPaymentDoc = `
  mutation SendPayment($input: SendPaymentInput!, $signature: SignatureInput!) {
    sendPayment(input: $input, signature: $signature)
  }
`;

export const getAccountNonceDoc = `
  query GetAccountNonce($publicKey: String!) {
    account(publicKey: $publicKey) {
      nonce
    }
  }
`;
