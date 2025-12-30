-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to call the Edge Function when a notification is created
CREATE OR REPLACE FUNCTION handle_new_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function to send the push notification
  -- IMPORTANT: We have filled in your specific URL and Key.
  PERFORM net.http_post(
    url := 'https://fvyhyexdndynoonkzwbd.supabase.co/functions/v1/handle-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2eWh5ZXhkbmR5bm9vbmt6d2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzczNDQ0NywiZXhwIjoyMDc5MzEwNDQ3fQ.CNOaNLB9BfTXNUME9AxXiNmZN9z0VVgCCfYTz0F2jbE'
    ),
    body := jsonb_build_object(
      'record', row_to_json(NEW)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS on_notification_created ON notifications;
CREATE TRIGGER on_notification_created
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_notification();
