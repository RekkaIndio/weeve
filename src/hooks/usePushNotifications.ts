
import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';

export const usePushNotifications = () => {
  const router = useRouter();

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const registerPush = async () => {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('User denied permissions!');
        return;
      }

      await PushNotifications.register();
    };

    registerPush();

    // Listeners
    const registrationListener = PushNotifications.addListener(
      'registration',
      (token) => {
        console.log('Push registration success, token: ' + token.value);
        // TODO: Send token to backend to save in user profile
      }
    );

    const registrationErrorListener = PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      }
    );

    const notificationReceivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
        // You can add custom toast/modal logic here if needed
        // For now, it will just show in the system tray (if background) or log (if foreground)
      }
    );

    const notificationActionPerformedListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
        
        // Handle deep linking or navigation based on data
        const data = notification.notification.data;
        if (data && data.url) {
            router.push(data.url);
        } else if (data && data.story_id) {
            router.push(`/story/${data.story_id}`);
        } else if (data && data.group_id) {
            router.push(`/groups/${data.group_id}`);
        } else {
             // Default to activity page if no specific target
             router.push('/activity');
        }
      }
    );

    return () => {
      registrationListener.then(listener => listener.remove());
      registrationErrorListener.then(listener => listener.remove());
      notificationReceivedListener.then(listener => listener.remove());
      notificationActionPerformedListener.then(listener => listener.remove());
    };
  }, [router]);
};
