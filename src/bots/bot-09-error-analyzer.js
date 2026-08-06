const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function run() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Get errors from past 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    
    const { data: errors, error: dbError } = await supabase
      .from('error_logs')
      .select('message, stack, context')
      .gt('created_at', sixHoursAgo)
      .limit(10);

    if (dbError) throw dbError;

    let analysis = 'No errors found in past 6 hours.';
    
    if (errors?.length > 0 && process.env.ANTHROPIC_API_KEY) {
      const client = new Anthropic();
      const errorSummary = errors.map(e => `${e.message} - ${e.context}`).join('\n');
      
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `Analyze these errors and suggest fixes:\n${errorSummary}`
          }
        ]
      });
      
      analysis = response.content[0].type === 'text' ? response.content[0].text : 'Analysis failed';
    }

    return {
      status: 'success',
      error_count: errors?.length || 0,
      analysis: analysis,
      recent_errors: errors?.slice(0, 3).map(e => e.message) || []
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message
    };
  }
};
