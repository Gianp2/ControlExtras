import {
  STANDARD_WORKDAY_MINUTES,
  applyRounding59,
  minutesToTimeString,
  parseAndRoundTime,
  calculateDailyMetrics,
  processDayIntervals,
  runCalculationTests,
} from './calculationService';

/**
 * Basic Test Runner for Calculation Service.
 * Tests 9-hour workday rules, :59 minute rounding, multiple intervals, and edge cases.
 */

export function executeUnitTests(): boolean {
  let hasFailed = false;

  function assert(condition: boolean, testName: string, details?: string) {
    if (!condition) {
      console.error(`❌ TEST FAILED: ${testName}`, details || '');
      hasFailed = true;
    } else {
      console.log(`✅ TEST PASSED: ${testName}`);
    }
  }

  console.log('--- RUNNING CALCULATION SERVICE UNIT TESTS ---');

  // Test 1: Standard Workday Constant
  assert(STANDARD_WORKDAY_MINUTES === 540, 'Standard Workday is 540 minutes (9 hours)');

  // Test 2: :59 Minute Rounding
  const r1759 = applyRounding59(17, 59);
  assert(r1759.hours === 18 && r1759.minutes === 0 && r1759.formatted === '18:00', '17:59 rounds to 18:00');
  assert(r1759.wasRounded59 === true, '17:59 wasRounded59 is true');

  const r0759 = applyRounding59(7, 59);
  assert(r0759.formatted === '08:00', '07:59 rounds to 08:00');

  const r1659 = applyRounding59(16, 59);
  assert(r1659.formatted === '17:00', '16:59 rounds to 17:00');

  const r1658 = applyRounding59(16, 58);
  assert(r1658.formatted === '16:58' && r1658.wasRounded59 === false, '16:58 is unchanged');

  // Test 3: String Parsing and Rounding
  const parseStr = parseAndRoundTime('17:59');
  assert(parseStr?.formatted === '18:00' && parseStr?.totalMinutes === 18 * 60, 'parseAndRoundTime("17:59") is 18:00');

  const parseExact = parseAndRoundTime('07:00');
  assert(parseExact?.formatted === '07:00' && parseExact?.totalMinutes === 7 * 60, 'parseAndRoundTime("07:00") is 07:00');

  // Test 4: Single interval 07:00 to 17:00 (10h worked, 1h extra)
  const case1 = processDayIntervals([{ entry: '07:00', exit: '17:00' }]);
  assert(case1.totalWorkedFormatted === '10:00', '07:00-17:00: Worked 10:00');
  assert(case1.normalFormatted === '09:00', '07:00-17:00: Normal 09:00');
  assert(case1.overtimeFormatted === '01:00', '07:00-17:00: Overtime 01:00');
  assert(case1.normalWorkdayEndFormatted === '16:00', '07:00-17:00: Normal shift ends at 16:00 (07:00 + 9h)');

  // Test 5: Single interval 07:00 to 16:00 (9h worked, 0h extra)
  const case2 = processDayIntervals([{ entry: '07:00', exit: '16:00' }]);
  assert(case2.totalWorkedFormatted === '09:00', '07:00-16:00: Worked 09:00');
  assert(case2.overtimeFormatted === '00:00', '07:00-16:00: Overtime 00:00');

  // Test 6: Non-round minutes: 06:56 to 17:00 (10:04 worked, 01:04 extra)
  const case3 = processDayIntervals([{ entry: '06:56', exit: '17:00' }]);
  assert(case3.normalWorkdayEndFormatted === '15:56', '06:56-17:00: Normal shift ends at 15:56');
  assert(case3.totalWorkedFormatted === '10:04', '06:56-17:00: Worked 10:04');
  assert(case3.overtimeFormatted === '01:04', '06:56-17:00: Overtime 01:04');

  // Test 7: Exit ending in :59: 08:00 to 16:59 (rounds to 17:00 -> 09:00 worked, 00:00 extra)
  const case4 = processDayIntervals([{ entry: '08:00', exit: '16:59' }]);
  assert(case4.lastExitFormatted === '17:00', '08:00-16:59: Exit rounded to 17:00');
  assert(case4.totalWorkedFormatted === '09:00', '08:00-16:59: Worked 09:00');
  assert(case4.overtimeFormatted === '00:00', '08:00-16:59: Overtime 00:00');

  // Test 8: Multiple intervals in one day (08:00-12:00 + 13:00-19:00 -> 10h worked, 1h extra)
  const case5 = processDayIntervals([
    { entry: '08:00', exit: '12:00' },
    { entry: '13:00', exit: '19:00' },
  ]);
  assert(case5.validIntervals.length === 2, 'Multiple intervals: 2 valid intervals processed');
  assert(case5.totalWorkedFormatted === '10:00', 'Multiple intervals: Total worked 10:00');
  assert(case5.firstEntryFormatted === '08:00', 'Multiple intervals: First entry 08:00');
  assert(case5.lastExitFormatted === '19:00', 'Multiple intervals: Last exit 19:00');
  assert(case5.normalWorkdayEndFormatted === '17:00', 'Multiple intervals: Normal shift end 17:00');
  assert(case5.overtimeFormatted === '01:00', 'Multiple intervals: Overtime 01:00');

  // Test 9: Multiple intervals total <= 9h (07:00-11:00 + 12:00-17:00 -> 9h worked, 0h extra)
  const case6 = processDayIntervals([
    { entry: '07:00', exit: '11:00' },
    { entry: '12:00', exit: '17:00' },
  ]);
  assert(case6.totalWorkedFormatted === '09:00', 'Multiple intervals (9h total): Worked 09:00');
  assert(case6.overtimeFormatted === '00:00', 'Multiple intervals (9h total): Overtime 00:00');

  // Test 10: Full Test Suite execution
  const suite = runCalculationTests();
  assert(suite.allPassed === true, `Full calculation test suite passed (${suite.passed}/${suite.total})`);

  console.log(`--- TESTS COMPLETE. ALL PASSED: ${!hasFailed} ---`);
  return !hasFailed;
}

// Auto-run if executed in Node / tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('calculationService.test')) {
  const ok = executeUnitTests();
  process.exit(ok ? 0 : 1);
}
