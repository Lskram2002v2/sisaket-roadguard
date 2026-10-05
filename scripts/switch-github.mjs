import { execSync } from 'child_process';
import readline from 'readline';

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim();
  } catch (err) {
    return null;
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n=============================================');
  console.log('🔄 Sisaket RoadGuard - GitHub Profile Switcher');
  console.log('=============================================\n');

  const currentRemote = run('git remote get-url origin') || 'Not set';
  const currentName = run('git config user.name') || 'Not set';
  const currentEmail = run('git config user.email') || 'Not set';

  console.log(`📌 ข้อมูลปัจจุบัน:`);
  console.log(`   Remote Origin: ${currentRemote}`);
  console.log(`   User Name:     ${currentName}`);
  console.log(`   User Email:    ${currentEmail}\n`);

  const newUsername = (await ask('1. ป้อน GitHub Username ใหม่ (เช่น new-user): ')).trim();
  if (!newUsername) {
    console.log('❌ ยกเลิก: ไม่ได้ระบุ Username');
    rl.close();
    return;
  }

  const newRepo = (await ask(`2. ชื่อ Repository [ค่าเริ่มต้น: sisaket-roadguard]: `)).trim() || 'sisaket-roadguard';
  const newEmail = (await ask(`3. อีเมล GitHub [ค่าเริ่มต้น: ${newUsername}@users.noreply.github.com]: `)).trim() || `${newUsername}@users.noreply.github.com`;
  const token = (await ask(`4. Personal Access Token (ถ้ามี/กด Enter เพื่อข้าม): `)).trim();

  let targetUrl = `https://github.com/${newUsername}/${newRepo}.git`;
  if (token) {
    targetUrl = `https://${token}@github.com/${newUsername}/${newRepo}.git`;
  }

  console.log(`\n⏳ กำลังอัปเดตการตั้งค่า Git...`);
  
  execSync(`git remote set-url origin ${targetUrl}`, { stdio: 'inherit' });
  execSync(`git config user.name "${newUsername}"`, { stdio: 'inherit' });
  execSync(`git config user.email "${newEmail}"`, { stdio: 'inherit' });

  console.log(`\n✅ ตั้งค่าเรียบร้อย!`);
  console.log(`   Remote ใหม่: https://github.com/${newUsername}/${newRepo}.git`);
  console.log(`   Author:     ${newUsername} <${newEmail}>`);

  const doPush = (await ask(`\n🚀 ต้องการ Push ขึ้น branch 'main' ทันทีหรือไม่? (y/n): `)).trim().toLowerCase();
  if (doPush === 'y' || doPush === 'yes') {
    try {
      console.log(`\n⏳ กำลัง Push ไปยัง GitHub (${newUsername}/${newRepo})...`);
      execSync('git push -u origin main', { stdio: 'inherit' });
      console.log(`\n🎉 Push สำเร็จเรียบร้อย!`);
    } catch (pushErr) {
      console.error(`\n⚠️ เกิดข้อผิดพลาดในการ Push (โปรดตรวจสอบสิทธิ์การเข้าถึงหรือ Token):`, pushErr.message);
    }
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
