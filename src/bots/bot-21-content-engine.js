const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const PILLARS = [
  'medical',
  'insurance',
  'subscriptions',
  'price_lock',
  'bill_negotiation',
  'full_system'
];

const PROMPTS = {
  medical: 'Generate a 28-word voiceover script about negotiating medical bills. Focus on surprising strategies people do not know about.',
  insurance: 'Generate a 28-word voiceover script about reducing insurance premiums. Include one shocking stat about overcharging.',
  subscriptions: 'Generate a 28-word voiceover script about finding hidden subscriptions and canceling them. Make it relatable.',
  price_lock: 'Generate a 28-word voiceover script about price-locking strategies for utilities. Focus on winter/summer tactics.',
  bill_negotiation: 'Generate a 28-word voiceover script about calling companies to negotiate bills. Include the exact opening line that works.',
  full_system: 'Generate a 28-word voiceover script that ties together ALL bill negotiation strategies: medical, insurance, subscriptions, utilities, and contracts.'
};

async function getRotationState(supabase) {
  try {
    const { data, error } = await supabase
      .from('content_logs')
      .select('metadata')
      .eq('action', 'pillar_rotation')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return { pillar_index: 0, script_count: 0 };
    }
    return data[0].metadata || { pillar_index: 0, script_count: 0 };
  } catch (e) {
    console.log('[BOT-21] Rotation state read failed, using default');
    return { pillar_index: 0, script_count: 0 };
  }
}

async function saveRotationState(supabase, state) {
  try {
    await supabase.from('content_logs').insert({
      action: 'pillar_rotation',
      metadata: state,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.log('[BOT-21] Rotation state save failed:', e.message);
  }
}

async function generateScript(openai, pillar) {
  const prompt = PROMPTS[pillar] || PROMPTS.bill_negotiation;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100,
    temperature: 0.7
  });

  let script = response.choices[0].message.content.trim();

  const words = script.split(/\s+/).length;
  if (words > 28) {
    const trimResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Rewrite this in EXACTLY 28 words: ' + script }],
      max_tokens: 50
    });
    script = trimResponse.choices[0].message.content.trim();
  }

  script = script.replace(/\$/g, '').replace(/\b(she|her|he|him)\b/gi, 'they');
  return script;
}

async function sendApprovalEmail(resend, videoId, script, pillar) {
  const watchUrl   = 'https://billaxe.app/api/content/videos/' + videoId + '/watch';
  const approveUrl = 'https://billaxe.app/api/content/videos/' + videoId + '/approve';
  const rejectUrl  = 'https://billaxe.app/api/content/videos/' + videoId + '/reject';

  const html = `
    <h2>New Content Script Generated</h2>
    <p><strong>Pillar:</strong> ${pillar}</p>
    <p><strong>Script:</strong></p>
    <blockquote style="background:#f5f5f5;padding:12px;border-left:3px solid #0066cc;">${script}</blockquote>
    <p>
      <a href="${watchUrl}"   style="display:inline-block;padding:10px 20px;background:#0066cc;color:white;text-decoration:none;margin-right:10px;">Watch</a>
      <a href="${approveUrl}" style="display:inline-block;padding:10px 20px;background:#28a745;color:white;text-decoration:none;margin-right:10px;">Approve</a>
      <a href="${rejectUrl}"  style="display:inline-block;padding:10px 20px;background:#dc3545;color:white;text-decoration:none;">Reject</a>
    </p>`;

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'billaxellc@gmail.com',
      subject: 'Content Approval: ' + pillar.replace(/_/g, ' '),
      html
    });
    console.log('[BOT-21] Email sent for', pillar);
    return true;
  } catch (e) {
    console.log('[BOT-21] Email send failed:', e.message);
    return false;
  }
}

async function run() {
  console.log('[BOT-21] [START] Content Engine Daily Generator');

  // Lazy-init all clients inside run() so load-time never crashes
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const resend   = new Resend(process.env.RESEND_API_KEY);
  const openai   = new (require('openai').default)({ apiKey: process.env.OPENAI_API_KEY });

  let state = await getRotationState(supabase);
  let emailsSent = 0;
  let emailsFailed = 0;

  const schedules = [
    { platform: 'youtube'   },
    { platform: 'instagram' },
    { platform: 'x'         },
    { platform: 'instagram' },
    { platform: 'youtube'   },
    { platform: 'x'         },
    { platform: 'instagram' },
    { platform: 'x'         }
  ];

  for (const sched of schedules) {
    if (state.script_count > 0 && state.script_count % 4 === 0) {
      state.pillar_index = PILLARS.indexOf('full_system');
    } else {
      state.pillar_index = (state.pillar_index + 1) % (PILLARS.length - 1);
    }

    const pillar = PILLARS[state.pillar_index];
    state.script_count += 1;

    try {
      const script = await generateScript(openai, pillar);

      const { data: video, error } = await supabase
        .from('content_videos')
        .insert({
          script,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      const sent = await sendApprovalEmail(resend, video.id, script, pillar);
      if (sent) emailsSent++;
      else emailsFailed++;

      console.log('[BOT-21] Generated', pillar, 'script for', sched.platform);

      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.log('[BOT-21] Script generation failed:', e.message);
      emailsFailed++;
    }
  }

  await saveRotationState(supabase, state);

  console.log('[BOT-21] [DONE] Emails:', emailsSent, 'sent,', emailsFailed, 'failed');
  return { success: true, emailsSent, emailsFailed };
}

module.exports = { run };
