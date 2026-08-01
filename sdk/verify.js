const { EticketProClient } = require('./dist/index.js');

const client = new EticketProClient({
  authBaseUrl: 'http://localhost:3001',
  eventsBaseUrl: 'http://localhost:3002',
  venueBaseUrl: 'http://localhost:3003',
  posBaseUrl: 'http://localhost:3004',
});

async function main() {
  const email = `sdk-verify-${Date.now()}@example.com`;
  await client.register({ email, password: 'SdkVerify!2026', fullName: 'SDK Verify' });
  console.log('register: OK');

  const tokens = await client.login(email, 'SdkVerify!2026');
  console.log('login: OK, token length', tokens.accessToken.length);

  const events = await client.listPublishedEvents();
  console.log('listPublishedEvents:', events.length, 'events');

  const formulas = await client.listSubscriptionFormulas();
  console.log('listSubscriptionFormulas:', formulas.length, 'formulas');

  const wallet = await client.getWallet(tokens.accessToken);
  console.log('getWallet: balance =', wallet.balance);

  const topup = await client.topupWallet(20, tokens.accessToken, 'APPLE_PAY');
  console.log('topupWallet (Apple Pay): new balance =', topup.wallet.balance);
}

main().then(() => console.log('\nSDK VERIFICATION: ALL OK')).catch((err) => {
  console.error('SDK VERIFICATION FAILED:', err.message);
  process.exit(1);
});
