import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * DELETE /api/delete-account
 * Permanently deletes a user account and all associated data.
 * Requires the user to be authenticated and can only delete their own account.
 */
export async function DELETE(request: NextRequest) {
    try {
        // Get the authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized: No valid authorization header' },
                { status: 401 }
            );
        }

        const accessToken = authHeader.split(' ')[1];

        // Create a client with the user's access token to verify their identity
        const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
        });

        // Get the current user from the token
        const { data: { user }, error: userError } = await userClient.auth.getUser();

        if (userError || !user) {
            console.error('[DeleteAccount] User verification failed:', userError);
            return NextResponse.json(
                { error: 'Unauthorized: Invalid or expired token' },
                { status: 401 }
            );
        }

        const userId = user.id;
        console.log('[DeleteAccount] Starting deletion for user:', userId);

        const { reason, feedback } = await request.json().catch(() => ({ reason: null, feedback: null }));

        // Create admin client with service role key for deletion operations
        if (!supabaseServiceRoleKey) {
            console.error('[DeleteAccount] Service role key not configured');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        // Save deletion reason if provided
        if (reason) {
            const { error: feedbackError } = await adminClient
                .from('deletion_reasons')
                .insert({
                    user_id: userId,
                    reason,
                    feedback_text: feedback,
                });
            
            if (feedbackError) {
                console.warn('[DeleteAccount] Failed to save feedback:', feedbackError);
                // Continue with deletion anyway
            }
        }

        // Delete user data from various tables
        // Note: Order matters due to foreign key constraints
        // The database should handle cascading deletes, but we'll be explicit

        // 1. Delete story likes by user
        const { error: likesError } = await adminClient
            .from('story_likes')
            .delete()
            .eq('user_id', userId);
        if (likesError) console.warn('[DeleteAccount] Error deleting likes:', likesError);

        // 2. Delete story comments by user
        const { error: commentsError } = await adminClient
            .from('story_comments')
            .delete()
            .eq('user_id', userId);
        if (commentsError) console.warn('[DeleteAccount] Error deleting comments:', commentsError);

        // 3. Delete story participants (contributions)
        const { error: participantsError } = await adminClient
            .from('story_participants')
            .delete()
            .eq('user_id', userId);
        if (participantsError) console.warn('[DeleteAccount] Error deleting story participants:', participantsError);

        // 4. Delete friend requests (sent and received)
        const { error: friendRequestsSentError } = await adminClient
            .from('friend_requests')
            .delete()
            .eq('from_user_id', userId);
        if (friendRequestsSentError) console.warn('[DeleteAccount] Error deleting sent friend requests:', friendRequestsSentError);

        const { error: friendRequestsReceivedError } = await adminClient
            .from('friend_requests')
            .delete()
            .eq('to_user_id', userId);
        if (friendRequestsReceivedError) console.warn('[DeleteAccount] Error deleting received friend requests:', friendRequestsReceivedError);

        // 5. Delete friendships
        const { error: friendships1Error } = await adminClient
            .from('friends')
            .delete()
            .eq('user_id', userId);
        if (friendships1Error) console.warn('[DeleteAccount] Error deleting friendships (user):', friendships1Error);

        const { error: friendships2Error } = await adminClient
            .from('friends')
            .delete()
            .eq('friend_id', userId);
        if (friendships2Error) console.warn('[DeleteAccount] Error deleting friendships (friend):', friendships2Error);

        // 6. Delete notifications for and by user
        const { error: notificationsToError } = await adminClient
            .from('notifications')
            .delete()
            .eq('user_id', userId);
        if (notificationsToError) console.warn('[DeleteAccount] Error deleting notifications (to):', notificationsToError);

        const { error: notificationsFromError } = await adminClient
            .from('notifications')
            .delete()
            .eq('actor_id', userId);
        if (notificationsFromError) console.warn('[DeleteAccount] Error deleting notifications (from):', notificationsFromError);

        // 7. Delete stories created by user
        const { error: storiesError } = await adminClient
            .from('stories')
            .delete()
            .eq('owner_id', userId);
        if (storiesError) console.warn('[DeleteAccount] Error deleting stories:', storiesError);

        // 8. Delete user profile
        const { error: profileError } = await adminClient
            .from('profiles')
            .delete()
            .eq('user_id', userId);
        if (profileError) {
            console.error('[DeleteAccount] Error deleting profile:', profileError);
            return NextResponse.json(
                { error: 'Failed to delete user profile' },
                { status: 500 }
            );
        }

        // 9. Delete the auth user
        const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
        if (authDeleteError) {
            console.error('[DeleteAccount] Error deleting auth user:', authDeleteError);
            return NextResponse.json(
                { error: 'Failed to delete authentication account' },
                { status: 500 }
            );
        }

        console.log('[DeleteAccount] Successfully deleted user:', userId);
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[DeleteAccount] Unexpected error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
