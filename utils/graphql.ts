import fetch from "node-fetch";

async function fetchGraphQL(
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

export const sendPaymentDoc = (
  data: Record<string, any>,
  signature: Record<string, any>
) => `
  mutation SendPayment {
    sendPayment(input: {fee: "${data.fee}", amount: "${data.amount}", to: "${data.to}", from: "${data.from}", nonce: "${data.nonce}"}, signature: {field: "${signature.field}", scalar: "${signature.scalar}"})
  }
`;

export default function executeMutation(operationsDoc: string) {
  return fetchGraphQL(operationsDoc, "SendPayment", {});
}
