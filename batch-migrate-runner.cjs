const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, 'migration-progress.json');

// --- CONFIGURATION ---
const START_YEAR = 2017;
const START_MONTH = 1;
const END_YEAR = 2026;
const END_MONTH = 3; // Current month

function getTargetMonths() {
  const months = [];
  let currY = START_YEAR;
  let currM = START_MONTH;

  while (currY < END_YEAR || (currY === END_YEAR && currM <= END_MONTH)) {
    months.push(`${currY}-${currM.toString().padStart(2, '0')}`);
    currM++;
    if (currM > 12) {
      currM = 1;
      currY++;
    }
  }
  return months;
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch (e) {
      return { completed: [] };
    }
  }
  return { completed: [] };
}

function saveProgress(month) {
  const progress = loadProgress();
  if (!progress.completed.includes(month)) {
    progress.completed.push(month);
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  }
}

async function runMigrationForMonth(month) {
  return new Promise((resolve, reject) => {
    console.log(`\n\n==================================================`);
    console.log(`🚀 STARTING MIGRATION FOR: ${month}`);
    console.log(`==================================================\n`);

    const child = spawn('node', ['migrate-api.cjs', month], {
      stdio: 'inherit', // Stream output directly to terminal
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ COMPLETED MIGRATION FOR: ${month}\n`);
        resolve();
      } else {
        console.error(`\n❌ FAILED MIGRATION FOR: ${month} (Exit code: ${code})\n`);
        reject(new Error(`Exit code ${code}`));
      }
    });
  });
}

async function main() {
  const allMonths = getTargetMonths();
  const progress = loadProgress();

  console.log(`📊 Found ${allMonths.length} months to migrate (2017-2026)`);
  
  for (const month of allMonths) {
    if (progress.completed.includes(month)) {
      console.log(`⏭️ Skipping already completed month: ${month}`);
      continue;
    }

    try {
      await runMigrationForMonth(month);
      saveProgress(month);
      
      // Small pause between months to let the server breathe
      console.log(`⏳ Cooling down for 5 seconds...`);
      await new Promise(r => setTimeout(r, 5000));
      
    } catch (err) {
      console.error(`🛑 Stopping batch due to error in month ${month}. Fix the issue and restart to resume.`);
      process.exit(1);
    }
  }

  console.log(`\n\n🎉 ALL MONTHS FROM ${START_YEAR} TO ${END_YEAR} SUCCESSFULLY MIGRATED!`);
}

main().catch(err => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
