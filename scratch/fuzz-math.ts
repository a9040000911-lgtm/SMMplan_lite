import { LoyaltyService } from '../../src/services/users/loyalty.service';
import { marketingService } from '../../src/services/marketing.service';

async function fuzzMath() {
  console.log("--- STARTING ISO 25010 MATHEMATICAL FUZZING ---");

  // TEST 1: Floating Point Issue
  const cents1 = Math.round(0.1 * 100);
  const cents2 = Math.round(0.2 * 100);
  const sum = cents1 + cents2;
  console.log(`[TEST 1] 0.1 + 0.2 in CENTS: Expected 30, Got: ${sum}`);

  // TEST 2: Remainder Allocation Split
  const totalAmount = 10000; // 100 RUB
  const parts = 3;
  const chunk = Math.floor(totalAmount / parts);
  const remainder = totalAmount % parts;
  let accumulated = 0;
  for (let i = 0; i < parts; i++) {
    const amt = chunk + (i === 0 ? remainder : 0);
    accumulated += amt;
    console.log(`Part ${i+1}: ${amt}`);
  }
  console.log(`[TEST 2] Split Total: Expected ${totalAmount}, Got ${accumulated}`);

  // TEST 3: Extreme Limits (Number.MAX_SAFE_INTEGER)
  const maxInt = Number.MAX_SAFE_INTEGER;
  const increased = maxInt + 1;
  const decreased = increased - 1;
  console.log(`[TEST 3] MAX_SAFE_INTEGER precision loss: MAX=${maxInt}, decreased=${decreased}, Match = ${maxInt === decreased}`);

  console.log("--- FUZZING COMPLETE ---");
}

fuzzMath();
