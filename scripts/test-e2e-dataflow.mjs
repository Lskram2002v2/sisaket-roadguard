import { createClient } from '@supabase/supabase-js';

const url = 'https://cybjbonnardearxckoig.supabase.co';
const key = 'sb_publishable_ow4P72Jh-Tz36aeBhalO_A_7AziO04D';

const supabase = createClient(url, key);

async function runDataFlowAudit() {
  console.log('\n======================================================');
  console.log('🔍  Sisaket RoadGuard: Live API & Data Flow Audit');
  console.log('======================================================\n');

  let passedSteps = 0;
  const totalSteps = 7;

  // 1. INGESTION TEST: Fetch 22 Districts
  console.log('▶️ [Step 1/7] Testing Districts Master GIS Ingestion...');
  const { data: districts, error: distErr } = await supabase
    .from('districts')
    .select('*')
    .order('district_code');

  if (distErr || !districts || districts.length !== 22) {
    console.error('❌ Failed to fetch 22 districts:', distErr?.message || `Got ${districts?.length}`);
  } else {
    console.log(`✅ [Pass] 22 Sisaket Districts retrieved successfully! (Code ${districts[0].district_code} ${districts[0].name_th} to ${districts[21].district_code} ${districts[21].name_th})`);
    passedSteps++;
  }

  // 2. CITIZEN INGESTION FLOW: Insert new report
  const testTrackingCode = `SKTEST-${Date.now().toString().slice(-4)}`;
  console.log(`\n▶️ [Step 2/7] Testing Citizen Report Ingestion Flow (${testTrackingCode})...`);
  
  const testPayload = {
    tracking_code: testTrackingCode,
    reporter_phone: '0899998888',
    latitude: 15.1186,
    longitude: 104.3220,
    district: 'เมืองศรีสะเกษ',
    subdistrict: 'เมืองเหนือ',
    landmark_description: 'ทดสอบระบบตรวจสอบการไหลข้อมูล หน้าศาลหลักเมืองศรีสะเกษ',
    photo_context_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    photo_closeup_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800',
    severity_level: 'HIGH',
    status: 'PENDING',
    upvote_count: 1,
  };

  const { data: insertedReport, error: insertErr } = await supabase
    .from('road_reports')
    .insert([testPayload])
    .select()
    .single();

  if (insertErr || !insertedReport) {
    console.error('❌ Ingestion insert failed:', insertErr?.message);
  } else {
    console.log(`✅ [Pass] Citizen report created in DB! ID: ${insertedReport.id}, Code: ${insertedReport.tracking_code}`);
    passedSteps++;
  }

  // 3. PDPA EGRESS / VIEW FLOW: Verify Public View masks phone
  console.log('\n▶️ [Step 3/7] Testing PDPA Public Egress View (Phone Masking)...');
  const { data: publicReports, error: pubErr } = await supabase
    .from('public_road_reports')
    .select('*')
    .eq('tracking_code', testTrackingCode)
    .single();

  if (pubErr || !publicReports) {
    console.error('❌ Public view query failed:', pubErr?.message);
  } else {
    const isMasked = publicReports.masked_phone === '089-XXX-888';
    if (isMasked) {
      console.log(`✅ [Pass] PDPA view is active! Original: 0899998888 ➔ Masked: ${publicReports.masked_phone}`);
      passedSteps++;
    } else {
      console.error(`❌ Phone mask mismatch. Got: ${publicReports.masked_phone}`);
    }
  }

  // 4. CITIZEN TRACKING EGRESS FLOW: Query by Code
  console.log('\n▶️ [Step 4/7] Testing Citizen Tracking Egress Flow...');
  const { data: trackedReport, error: trackErr } = await supabase
    .from('road_reports')
    .select('tracking_code, district, landmark_description, status, severity_level, created_at')
    .eq('tracking_code', testTrackingCode)
    .single();

  if (trackErr || !trackedReport) {
    console.error('❌ Tracking query failed:', trackErr?.message);
  } else {
    console.log(`✅ [Pass] Citizen Tracking query returned valid data: ${trackedReport.tracking_code} [${trackedReport.status}] in ${trackedReport.district}`);
    passedSteps++;
  }

  // 5. ADMIN EGRESS & STATUS UPDATE FLOW: Update to IN_PROGRESS and RESOLVED
  console.log('\n▶️ [Step 5/7] Testing Admin Action & Status Update Flow...');
  const { data: updatedReport, error: updateErr } = await supabase
    .from('road_reports')
    .update({
      status: 'RESOLVED',
      admin_notes: 'ดำเนินการปะซ่อมลาดยางเสร็จสิ้น ทดสอบการจ่ายข้อมูล',
      assigned_team: 'หมวดทางหลวงเมืองศรีสะเกษ',
      resolved_at: new Date().toISOString(),
    })
    .eq('tracking_code', testTrackingCode)
    .select()
    .single();

  if (updateErr || !updatedReport || updatedReport.status !== 'RESOLVED') {
    console.error('❌ Admin status update failed:', updateErr?.message);
  } else {
    console.log(`✅ [Pass] Admin updated report to RESOLVED with assigned team: ${updatedReport.assigned_team}`);
    passedSteps++;
  }

  // 6. CITIZEN SOCIAL FLOW: Upvote and 5-Star Rating
  console.log('\n▶️ [Step 6/7] Testing Community Upvote (+1) & 5-Star Rating Flow...');
  const { data: ratedReport, error: rateErr } = await supabase
    .from('road_reports')
    .update({
      upvote_count: 5,
      rating: 5,
      rating_feedback: 'ซ่อมรวดเร็วมาก ประทับใจการทำงานของเจ้าหน้าที่ครับ',
    })
    .eq('tracking_code', testTrackingCode)
    .select()
    .single();

  if (rateErr || !ratedReport || ratedReport.rating !== 5) {
    console.error('❌ Upvote/Rating update failed:', rateErr?.message);
  } else {
    console.log(`✅ [Pass] Upvote & 5-star rating registered successfully! Upvotes: ${ratedReport.upvote_count}, Rating: ${ratedReport.rating} ⭐`);
    passedSteps++;
  }

  // 7. CLEANUP TEST DATA
  console.log('\n▶️ [Step 7/7] Cleaning up test record...');
  const { error: delErr } = await supabase
    .from('road_reports')
    .delete()
    .eq('tracking_code', testTrackingCode);

  if (delErr) {
    console.warn('⚠️ Cleanup warning:', delErr.message);
  } else {
    console.log(`✅ [Pass] Cleaned up test record ${testTrackingCode}`);
    passedSteps++;
  }

  console.log('\n======================================================');
  console.log(`📊 Audit Result: ${passedSteps}/${totalSteps} Tests Passed (${Math.round((passedSteps/totalSteps)*100)}%)`);
  console.log('======================================================\n');
}

runDataFlowAudit();
