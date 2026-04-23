async function testRemainderAllocation() {
    console.log('--- START REMAINDER ALLOCATION (DRIP-FEED) TEST ---');

    const charge = 100; // 100 kopecks
    const runs = 3;
    
    // Simulate what happens in standard operations
    // Chunk 1 finishes.
    let currentRun = 1;

    // Fails on Chunk 2.
    const remainingRuns = runs - currentRun; // 3 - 1 = 2
    
    // Original Code logic
    const floatResult = charge * (remainingRuns / runs);
    const refundAmount = Math.floor(floatResult);
    
    // Real consumed cost + refunded cost
    // They ran 1 chunk. If charge is 100 for 3 runs, 1 run "costs" 33.333 -> 33
    const consumedAmount = Math.floor(charge * (currentRun / runs));
    const finalSystemSum = consumedAmount + refundAmount;
    
    console.log(`Original Code Float Result: ${floatResult}`);
    console.log(`Refund Amount: ${refundAmount}`);
    console.log(`Consumed Amount (Run 1): ${consumedAmount}`);
    console.log(`System Total (Consumed + Refund): ${finalSystemSum}`);
    
    if (finalSystemSum !== charge) {
        console.log(`--- EXPLOIT/BUG CONFIRMED: System loses ${charge - finalSystemSum} units to the digital void! ---`);
    } else {
        console.log('Math holds up.');
    }
}

testRemainderAllocation().then(() => process.exit(0));
