import {
  Field,
  state,
  State,
  method,
  UInt64,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
  Bool,
  PublicKey,
} from "o1js";
// import { getProfiler } from "./utils/profiler.js";

const doProofs = true;

const beforeGenesis = UInt64.from(Date.now());

class SimpleZkapp extends SmartContract {
  @state(Field) x = State<Field>();

  events = { update: Field, payout: UInt64, payoutReceiver: PublicKey };

  @method
  async init() {
    super.init();
    this.x.set(initialState);
  }

  @method
  async update(y: Field) {
    this.account.provedState.requireEquals(Bool(true));
    this.network.timestamp.requireBetween(beforeGenesis, UInt64.MAXINT());
    this.emitEvent("update", y);
    let x = this.x.get();
    this.x.requireEquals(x);
    let newX = x.add(y);
    this.x.set(newX);
    return newX;
  }

  /**
   * This method allows a certain privileged account to claim half of the zkapp balance, but only once
   * @param caller the privileged account
   */
  @method
  async payout(callerBase58: string) {
    this.account.provedState.requireEquals(Bool(true));

    // check that caller is the privileged account
    let callerAddress: PublicKey = PublicKey.fromBase58(callerBase58);
    callerAddress.assertEquals(privilegedAddress);

    // assert that the caller account is new - this way, payout can only happen once
    let callerAccountUpdate = AccountUpdate.create(callerAddress);
    callerAccountUpdate.account.isNew.requireEquals(Bool(true));
    // pay out half of the zkapp balance to the caller
    let balance = this.account.balance.get();
    this.account.balance.requireEquals(balance);
    let halfBalance = balance.div(2);
    this.send({ to: callerAccountUpdate, amount: halfBalance });

    // emit some events
    this.emitEvent("payoutReceiver", callerAddress);
    this.emitEvent("payout", halfBalance);
  }
}

// const SimpleProfiler = getProfiler("Simple zkApp");
// SimpleProfiler.start("Simple zkApp test flow");
let ZekoNet = Mina.Network("http://sequencer-zeko-dev.dcspark.io/graphql");
Mina.setActiveInstance(ZekoNet);

// a test account that pays all the fees, and puts additional funds into the zkapp
// let { privateKey: senderKey, publicKey: sender } = ZekoNet.testAccounts[0];

// to use this test, change this private key to an account which has enough MINA to pay fees
let senderKey = PrivateKey.fromBase58(
  "EKFMtcodTKjV1rH3x1WUs3Wp1t4fJhthWfxXyrG8Qc2YHHa2176p" // Private Key 5
);
let sender = senderKey.toPublicKey();
// Public Key 5: B62qjaVovMiDjQRWTh48opeyUh6eGVcosKQT4DvRo34jRYWqoKk71Ac

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

// a special account that is allowed to pull out half of the zkapp balance, once
let privilegedBase58 =
  "B62qnAChMf47nHmwNtSaK1oWAxTdHHX7F63whuCkFmEaA1ePr9UqRyP";
let privilegedKey = PrivateKey.fromBase58(
  "EKEeoESE2A41YQnSht9f7mjiKpJSeZ4jnfHXYatYi8xJdYSxWBep"
);
let privilegedAddress = privilegedKey.toPublicKey();

let initialBalance = 10_000_000_000;
let initialState = Field(1);
let zkapp = new SimpleZkapp(zkappAddress);

export async function main() {
  if (doProofs) {
    console.log("compile");
    console.time("compile");
    await SimpleZkapp.compile();
    console.timeEnd("compile");
  } else {
    await SimpleZkapp.analyzeMethods();
  }

  console.log("deploy");
  let tx = await Mina.transaction(sender, async () => {
    let senderUpdate = AccountUpdate.fundNewAccount(sender);
    senderUpdate.send({ to: zkappAddress, amount: initialBalance });
    zkapp.deploy();
  });
  await tx.prove();
  await tx.sign([senderKey, zkappKey]).send();

  console.log("initial state: " + zkapp.x.get());
  console.log(`initial balance: ${zkapp.account.balance.get().div(1e9)} MINA`);

  let account = Mina.getAccount(zkappAddress);
  console.log(
    "account state is proved:",
    account.zkapp?.provedState.toBoolean()
  );

  console.log("update");
  tx = await Mina.transaction(sender, async () => {
    await zkapp.update(Field(3));
  });
  await tx.prove();
  await tx.sign([senderKey]).send();

  // pay more into the zkapp -- this doesn't need a proof
  console.log("receive");
  tx = await Mina.transaction(sender, async () => {
    let payerAccountUpdate = AccountUpdate.createSigned(sender);
    payerAccountUpdate.send({ to: zkappAddress, amount: UInt64.from(8e9) });
  });
  await tx.sign([senderKey]).send();

  console.log("payout");
  tx = await Mina.transaction(sender, async () => {
    AccountUpdate.fundNewAccount(sender);
    await zkapp.payout(privilegedBase58);
  });
  await tx.prove();
  await tx.sign([senderKey]).send();
  sender;

  console.log("final state: " + zkapp.x.get());
  console.log(`final balance: ${zkapp.account.balance.get().div(1e9)} MINA`);

  console.log("try to payout a second time..");
  tx = await Mina.transaction(sender, async () => {
    await zkapp.payout(privilegedBase58);
  });
  try {
    await tx.prove();
    await tx.sign([senderKey]).send();
  } catch (err: any) {
    console.log("Transaction failed with error", err.message);
  }

  console.log("try to payout to a different account..");
  try {
    tx = await Mina.transaction(sender, async () => {
      await zkapp.payout(privilegedBase58);
    });
    await tx.prove();
    await tx.sign([senderKey]).send();
  } catch (err: any) {
    console.log("Transaction failed with error", err.message);
  }

  console.log(
    `should still be the same final balance: ${zkapp.account.balance
      .get()
      .div(1e9)} MINA`
  );

  // SimpleProfiler.stop().store();
}
