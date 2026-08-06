const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Get bills completed in past 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: completedBills, error } = await supabase
      .from('uploaded_bills')
      .select('id, user_id, provider_name, negotiated_amount, original_amount')
      .eq('status', 'complete')
      .gt('updated_at', yesterday);

    if (error) throw error;

    // Get user emails for those bills
    let emailsSent = 0;
    if (completedBills?.length > 0) {
      const userIds = [...new Set(completedBills.map(b => b.user_id))];
      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      for (const user of users || []) {
        const userBills = completedBills.filter(b => b.user_id === user.id);
        const totalSaved = userBills.reduce((sum, b) => sum + Math.max(0, (b.original_amount || 0) - (b.negotiated_amount || 0)), 0);

        await transporter.sendMail({
          to: user.email,
          subject: `Great news! We negotiated ${userBills.length} bill(s) for you 🎉`,
          html: `<p>We successfully negotiated <strong>${userBills.length}</strong> bill(s) and saved you <strong>$${totalSaved.toFixed(2)}</strong>!</p>`
        }).catch(() => {});
        emailsSent++;
      }
    }

    return {
      status: 'success',
      completions_24h: completedBills?.length || 0,
      emails_sent: emailsSent,
      message: `Sent ${emailsSent} success emails`
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
