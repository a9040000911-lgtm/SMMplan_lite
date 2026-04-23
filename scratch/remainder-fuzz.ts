// TEST: Drip Feed Refund Remainder Leak 
function testDripRemainder() {
  const charge = 1000; // 10 RUB
  const runs = 3;
  let refunded = 0;
  
  // Simulated cancel run by run
  for (let i = runs; i > 0; i--) {
    // If it cancels 1 run, refund ratio is 1/3
    const ratio = 1 / runs;
    const partialRefund = Math.floor(charge * ratio);
    refunded += partialRefund;
  }
  console.log(`Charge: ${charge}, Total Refunded if all runs fail individually: ${refunded}`);
  if (charge !== refunded) {
    console.log(`[FATAL] Remainder leak detected! Difference: ${charge - refunded}`);
  }
}

testDripRemainder();
