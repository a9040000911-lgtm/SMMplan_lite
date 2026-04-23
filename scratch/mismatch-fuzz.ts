function testAccountingMismatch() {
  const charge = 1000;
  const quantity = 3;
  const remains = 2; // 2/3 of order failed

  // User logic (balance increment from sync-worker.ts)
  const refundToUser = Math.floor(charge * (remains / quantity));

  // Accounting logic (from accounting.service.ts)
  const refundInReport = Math.round(charge * (remains / quantity));

  console.log(`[TEST] Charge: ${charge}, Ratio: ${remains}/${quantity}`);
  console.log(`User gets: ${refundToUser}`);
  console.log(`Report claims: ${refundInReport}`);

  if (refundToUser !== refundInReport) {
    console.log(`FATAL: Double-entry mismatch detected! Difference: ${refundInReport - refundToUser}`);
  }
}
testAccountingMismatch();
